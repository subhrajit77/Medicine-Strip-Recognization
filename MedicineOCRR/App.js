import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, Image, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import * as Speech from "expo-speech";
import { Camera } from "expo-camera";

const App = () => {
    const [imageUri, setImageUri] = useState(null);
    const [medicineData, setMedicineData] = useState(null);
    const [hasPermission, setHasPermission] = useState(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const cameraRef = useRef(null);
    // let cameraRef;

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");

            const galleryPermission =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (galleryPermission.status !== "granted") {
                Alert.alert(
                    "Permission Denied",
                    "You need to allow access to gallery."
                );
            }
        })();
    }, []);
    console.log("Camera Ref:", cameraRef);

    const takePicture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync();
            setImageUri(photo.uri);
            setCameraOpen(false);
            processImage(photo.uri);
        }
    };

    const processImage = async (uri) => {
        try {
            const formData = new FormData();
            formData.append("image", {
                uri: uri,
                type: "image/jpeg",
                name: "medicine.jpg",
            });

            const res = await axios.post(
                "http://192.168.33.35:5000/extract",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            if (res && res.data) {
                console.log("Medicine Data:", res.data);
                console.log(
                    "Medicine Name Type:",
                    typeof res.data.medicineName
                );
                console.log("Expiry Date Type:", typeof res.data.expiryDate);

                setMedicineData(res.data);
            } else {
                console.log("Error: Invalid response from API");
            }
        } catch (error) {
            console.log(error, "Error processing image");
        }
    };

    const selectImage = async () => {
        let result;
        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                quality: 1,
            });
        } catch (error) {
            console.log(error, "Error in selecting image");
        }
        try {
            if (!result.canceled) {
                setImageUri(result.assets[0].uri);
                processImage(result.assets[0].uri);
            }
        } catch (error) {
            console.log(error, "Error in sending image");
        }
    };

    if (hasPermission === null) {
        return <View />;
    }
    if (hasPermission === false) {
        return <Text>No access to camera</Text>;
    }

    return (
        <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
            <Button title="Select Image" onPress={selectImage} />
            <Button
                title={cameraOpen ? "Close Camera" : "Open Camera"}
                onPress={() => setCameraOpen(!cameraOpen)}
            />

            {cameraOpen && (
                <View style={{ width: 300, height: 300 }}>
                    <Camera style={{ flex: 1 }} ref={cameraRef}>
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: "transparent",
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "flex-end",
                                marginBottom: 20,
                            }}
                        >
                            <Button
                                title="Take Picture"
                                onPress={takePicture}
                            />
                        </View>
                    </Camera>
                </View>
            )}

            {imageUri && !cameraOpen && (
                <Image
                    source={{ uri: imageUri }}
                    style={{ width: 200, height: 200, margin: 20 }}
                />
            )}
            {medicineData && (
                <View style={{ alignItems: "center", marginTop: 20 }}>
                    {medicineData.medicineName ? (
                        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                            Medicine: {String(medicineData.medicineName)}
                        </Text>
                    ) : (
                        <Text>Medicine Name Not Found</Text>
                    )}

                    {medicineData.expiryDate ? (
                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: "bold",
                                marginBottom: 10,
                            }}
                        >
                            Expiry: {String(medicineData.expiryDate)}
                        </Text>
                    ) : (
                        <Text>Expiry Date Not Found</Text>
                    )}

                    <Button
                        title="Read Aloud"
                        onPress={() =>
                            Speech.speak(
                                `${medicineData.medicineName}, expires on ${medicineData.expiryDate}`
                            )
                        }
                    />
                </View>
            )}
        </View>
    );
};

export default App;

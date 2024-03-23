import { useEffect, useState } from "react";
import Pressable from "../../other/Pressable";

function checkImageBrightnessFast(imageSrc, callback) {
    var img = new Image();
    img.crossOrigin = "Anonymous"; // Ensure CORS policy allows image processing
    img.src = imageSrc;
    img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var sampleSize = 10; // Sample every 10th pixel
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;
        var r, g, b, avg;
        var total = 0;
        var count = 0;

        for(var x = 0, len = data.length; x < len; x += 4 * sampleSize) {
            r = data[x];
            g = data[x+1];
            b = data[x+2];

            avg = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            total += avg;
            count++;
        }

        var brightness = total / count;
        callback(brightness > 128 ? 'light' : 'dark');
    };
    img.onerror = function() {
        console.error("Cannot load image");
    }
}

function FormImageOCRReader({ openModal, children, showRecogintion, recognize, imgURL }) {
    const [recognitionResult, setRecognitionResult] = useState(null);
    const [imgBrightness, setImgBrightness] = useState('light');

    useEffect(() => {
        if (showRecogintion && imgURL) {
            checkImageBrightnessFast(imgURL, setImgBrightness);
        }
    }, [
        showRecogintion,
        imgURL,
    ])

    useEffect(() => {
        if (showRecogintion && imgURL) {
            recognize(imgURL)
                .then(setRecognitionResult)
                .catch(() => setRecognitionResult(false))
        } else if (imgURL === false) {
            setRecognitionResult(false);
        }
    }, [
        showRecogintion,
        imgURL,
    ])

    const hasRecognitionResult = recognitionResult === null || (recognitionResult && recognitionResult.import)

    return (
        <Pressable
            onClick={openModal}
            style={{
                position: 'relative',
                display: 'inline-block',
                border: (showRecogintion && hasRecognitionResult) ? '2px solid #ccc' : '2px solid transparent',
                borderRadius: 10,
                cursor: 'pointer',
            }}
        >
            {
                (showRecogintion && hasRecognitionResult) && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        color: imgBrightness === 'light' ? '#333' : '#ddd',
                        zIndex: 1, // Ensure the text is above the image
                        cursor: 'pointer',
                    }}>
                        {
                            recognitionResult
                            ? (
                                <>
                                    <p>{recognitionResult.date}</p>
                                    <p style={{ fontWeight: 'bold' }}>{recognitionResult.import}</p>
                                </>
                            )
                            : recognitionResult === null ? 'Llegint...'
                            : 'Error'
                        }
                    </div>
                )
            }
            <div
                style={{
                    filter: (showRecogintion && hasRecognitionResult) ? 'blur(5px)' : 'none',
                    cursor: 'pointer',
                }}
            >
                {children}
            </div>
        </Pressable>
    )
} 

export default FormImageOCRReader;
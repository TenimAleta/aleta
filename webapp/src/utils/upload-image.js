import S3 from 'aws-sdk/clients/s3';
const accessKeys = require('../aws.credentials.json');

const s3 = new S3({
    accessKeyId: accessKeys.accessKeyId,
    secretAccessKey: accessKeys.secretAccessKey,
    region: accessKeys.region,
});    

export const uploadImage = async (base64, user, colla) => {
    // Convert the base64 image to an Image object
    const image = new Image();
    image.src = base64;

    await new Promise((resolve) => {
        image.onload = async () => {
            // Get the image dimensions
            const imageWidth = image.width;
            const imageHeight = image.height;
            const minSide = Math.min(imageWidth, imageHeight);

            if (minSide < 200) {
                alert('Si us plau, penja una imatge més gran');
                resolve();
                return;
            }

            // Create a canvas to manipulate the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set the canvas to the size of the cropped square image
            canvas.width = minSide;
            canvas.height = minSide;

            // Crop the image to a square
            ctx.drawImage(
                image,
                imageWidth / 2 - minSide / 2,
                imageHeight / 2 - minSide / 2,
                minSide,
                minSide,
                0,
                0,
                minSide,
                minSide
            );

            // Create another canvas to resize the image
            const resizedCanvas = document.createElement('canvas');
            resizedCanvas.width = 400;
            resizedCanvas.height = 400;
            const resizedCtx = resizedCanvas.getContext('2d');
            resizedCtx.drawImage(canvas, 0, 0, 400, 400);

            // Convert the canvas back to base64
            const compressedBase64 = resizedCanvas.toDataURL('image/png');

            const params = {
                Bucket: 'aleta-' + colla,
                Key: `profile_pics/${user}.base64`,
                Body: compressedBase64,
            };

            try {
                await s3.putObject(params).promise();
                console.log('Successfully uploaded image to S3.');
            } catch (error) {
                console.error(`Could not upload file to S3: ${error.message}`)
                throw new Error(`Could not upload file to S3: ${error.message}`)
            }

            resolve();
        };
    });
}

export const downloadImage = async (user, colla) => {
    const params = {
        Bucket: 'aleta-' + colla,
        Key: `profile_pics/${user}.base64`,
    };

    try {
        const data = await s3.getObject(params).promise();
        return data.Body.toString()
    } catch (error) {
        // throw new Error(`Could not retrieve file from S3: ${error.message}`)
    }
}

const uriToBase64 = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
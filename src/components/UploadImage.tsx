import React, { useState, useEffect } from 'react';
import { Upload } from '@aws-sdk/lib-storage';
import { S3_BUCKET_NAME, s3Client } from '../config/aws';
import { Upload as UploadIcon, X, Download } from 'lucide-react';
import { colors } from '../config/theme';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const UploadImage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [images, setImages] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [eventId, setEventId] = useState<string>('');
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

    useEffect(() => {
        if (location.state?.eventId) {
            setEventId(location.state.eventId);
        }
    }, [location]);
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // Prevent selfie uploads in main image upload
            const nonSelfieFiles = files.filter(file => {
                const fileName = file.name.toLowerCase();
                return !fileName.includes('selfie') && !fileName.includes('self');
            });
            setImages(nonSelfieFiles);
            if (files.length !== nonSelfieFiles.length) {
                alert('Selfie images should be uploaded through the selfie upload page.');
            }
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const uploadToS3 = async (file: File, fileName: string) => {
        try {
            console.log(`Uploading file: ${fileName}`);
    
            // Get user's email, name and role from localStorage
            const userEmail = localStorage.getItem('userEmail');
            const userName = localStorage.getItem('userName');
            const userRole = localStorage.getItem('userRole') || 'user';
            
            // Ensure we have a valid identifier for the user folder
            if (!userEmail && !userName) {
                throw new Error('User authentication required. Please log in to upload images.');
            }
            
            // Create a sanitized folder name from the email or username
            const userIdentifier = userEmail || userName || '';
            const userFolder = userIdentifier.replace(/[^a-zA-Z0-9]/g, '_');
    
            const uploadParams = {
                Bucket: S3_BUCKET_NAME,
                Key: `events/${userEmail}/${eventId}/images/${fileName}`,
                Body: file,
                ContentType: file.type,
                Metadata: {
                    'event-id': eventId,
                    'user-email': userEmail,
                    'upload-date': new Date().toISOString()
                }
            };
    
            const upload = new Upload({
                client: s3Client,
                params: {
                    ...uploadParams,
                    Metadata: {
                        'event-id': eventId,
                        'user-email': userEmail || '',  // Ensure null is converted to empty string
                        'upload-date': new Date().toISOString()
                    }
                },
                partSize: 5 * 1024 * 1024,
                leavePartsOnError: false,
            });
    
            // Start the upload
            const data = await upload.done();
            console.log('Upload success:', data);
    
            return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${userRole}/${userFolder}/${fileName}`;
        } catch (error) {
            console.error("Error uploading to S3:", error);
            throw error;
        }
    };

    const handleUpload = async () => {
        if (images.length === 0) {
            alert("Please select at least one image to upload.");
            return;
        }

        setIsUploading(true);
        setUploadSuccess(false);

        try {
            const uploadPromises = images.map(async (image) => {
                if (!image.type.startsWith('image/')) {
                    throw new Error(`${image.name} is not a valid image file`);
                }
                if (image.size > 10 * 1024 * 1024) {
                    throw new Error(`${image.name} exceeds the 10MB size limit`);
                }
                const fileName = `${Date.now()}-${image.name}`;
                const imageUrl = await uploadToS3(image, fileName);
                return imageUrl;
            });

            const urls = await Promise.all(uploadPromises);
            console.log('Uploaded images:', urls);
            setUploadedUrls(urls);
            setEventId(Date.now().toString());
            setUploadSuccess(true);
        } catch (error) {
            console.error('Error uploading images:', error);
            alert(error instanceof Error ? error.message : "Failed to upload images. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownload = async (url: string) => {
        try {
            const response = await fetch(url, {
                mode: 'cors',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                const errorMessage = `Failed to download image (${response.status}): ${response.statusText}`;
                console.error(errorMessage);
                alert(errorMessage);
                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('image/')) {
                const errorMessage = 'Invalid image format received';
                console.error(errorMessage);
                alert(errorMessage);
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const fileName = decodeURIComponent(url.split('/').pop() || 'image.jpg');
            
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
            console.log(`Successfully downloaded: ${fileName}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while downloading the image';
            console.error('Error downloading image:', error);
            alert(errorMessage);
            throw error;
        }
    };

    const handleDownloadAll = async () => {
        let successCount = 0;
        let failedUrls: string[] = [];

        for (const url of uploadedUrls) {
            try {
                await handleDownload(url);
                successCount++;
                // Add a small delay between downloads to prevent browser throttling
                await new Promise(resolve => setTimeout(resolve, 800));
            } catch (error) {
                console.error(`Failed to download image from ${url}:`, error);
                failedUrls.push(url);
            }
        }

        if (failedUrls.length === 0) {
            alert(`Successfully downloaded all ${successCount} images!`);
        } else {
            alert(`Downloaded ${successCount} images. Failed to download ${failedUrls.length} images. Please try again later.`);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen bg-white">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md border-2 border-aquamarine">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Images</h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="w-full flex flex-col items-center px-4 py-6 bg-white rounded-lg border-2 border-turquoise border-dashed cursor-pointer hover:border-aquamarine hover:bg-champagne transition-colors duration-200">
                            <div className="flex flex-col items-center">
                                <UploadIcon className="w-8 h-8 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    PNG, JPG, GIF up to 10MB
                                </p>
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleImageChange}
                                accept="image/*"
                            />
                        </label>
                    </div>

                    {images.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-600 mb-2">{images.length} file(s) selected</p>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(images).map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt={`Preview ${index + 1}`}
                                            className="w-20 h-20 object-cover rounded"
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleUpload}
                        disabled={isUploading || images.length === 0}
                        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-turquoise hover:bg-aquamarine hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-turquoise transition-colors duration-200 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isUploading ? 'Uploading...' : 'Upload Images'}
                    </button>
                </div>

                {uploadSuccess && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                Successfully uploaded {images.length} image(s)!
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm">
                                <div className="flex flex-wrap gap-4 mb-4">
                                    {uploadedUrls.map((url, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={url}
                                                alt={`Uploaded ${index + 1}`}
                                                className="w-20 h-20 object-cover rounded"
                                            />
                                            <button
                                                onClick={() => handleDownload(url)}
                                                className="absolute -bottom-2 -right-2 bg-turquoise text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Download image"
                                            >
                                                <Download className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {uploadedUrls.length > 1 && (
                                    <button
                                        onClick={handleDownloadAll}
                                        className="mb-4 px-4 py-2 bg-turquoise text-white rounded-md hover:bg-aquamarine hover:text-gray-800 transition-colors duration-200 flex items-center gap-2 w-full justify-center"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download All Images
                                    </button>
                                )}
                                <p className="text-gray-700 mb-4">Scan QR code to upload selfie:</p>
                                <QRCodeSVG
                                    value={`${window.location.origin}/upload_selfie/${eventId}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                                <Link
                                    to={`/upload_selfie/${eventId}`}
                                    className="mt-4 text-turquoise hover:text-aquamarine transition-colors duration-200 underline"
                                >
                                    Direct link to selfie upload
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadImage;

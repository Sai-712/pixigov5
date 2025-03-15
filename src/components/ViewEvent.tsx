import React, { useState, useEffect } from 'react';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKET_NAME } from '../config/aws';
import { Camera, X, ArrowLeft, Download, Trash2 } from 'lucide-react';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Link } from 'react-router-dom';

interface ViewEventProps {
  eventId: string;
}

interface EventImage {
  url: string;
  key: string;
}

const ViewEvent: React.FC<ViewEventProps> = ({ eventId }) => {
  const [images, setImages] = useState<EventImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<EventImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventImages();
  }, [eventId]);

  const fetchEventImages = async () => {
    try {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) throw new Error('User not authenticated');

      const listCommand = new ListObjectsV2Command({
        Bucket: S3_BUCKET_NAME,
        Prefix: `events/${userEmail}/${eventId}/`
      });

      const result = await s3Client.send(listCommand);
      if (!result.Contents) return;

      const imageItems = result.Contents
        .filter(item => item.Key && item.Key.match(/\.(jpg|jpeg|png)$/i))
        .map(item => ({
          url: `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${item.Key}`,
          key: item.Key || ''
        }));

      setImages(imageItems);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching event images:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 mb-4">⚠️</div>
          <p className="text-gray-800">{error}</p>
          <Link to="/events" className="mt-4 inline-flex items-center text-primary hover:text-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/events" className="flex items-center text-gray-600 hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Events
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Event Gallery</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div
            key={image.key}
            className="relative aspect-square overflow-hidden rounded-lg shadow-lg cursor-pointer transform hover:scale-105 transition-transform duration-300"
            onClick={() => setSelectedImage(image)}
          >
            <img
              src={image.url}
              alt={`Event image ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const a = document.createElement('a');
                  a.href = image.url;
                  a.download = image.key.split('/').pop() || 'image';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                <Download className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const deleteCommand = new DeleteObjectCommand({
                    Bucket: S3_BUCKET_NAME,
                    Key: image.key
                  });
                  s3Client.send(deleteCommand).then(() => {
                    setImages(prev => prev.filter(img => img.key !== image.key));
                  }).catch(error => {
                    console.error('Error deleting image:', error);
                  });
                }}
                className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">No images found for this event</p>
          <p className="text-gray-400 mt-2">Images uploaded to this event will appear here</p>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage.url}
            alt="Selected event image"
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default ViewEvent;
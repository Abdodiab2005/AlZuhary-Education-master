import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';

export default function Lectuer() {
    const location = useLocation();
    const { lessonId, courseId } = useParams();
    const navigate = useNavigate();
    const [videoUrl, setVideoUrl] = useState(location.state?.videoUrl || '');
    const [loading, setLoading] = useState(!videoUrl);
    const [error, setError] = useState(null);
    const [accessChecked, setAccessChecked] = useState(false);
    const isAssignment = location.state?.isAssignment;

    // التحقق من إمكانية الوصول للحصة
    useEffect(() => {
        const checkAccess = async () => {
            if (!courseId || !lessonId) return;
            
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // إذا كان واجب، متاح دائماً بدون تحقق
            if (isAssignment) {
                setAccessChecked(true);
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/lessons/${lessonId}/access-check`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (!response.data.canAccess) {
                    alert('يجب نجاح امتحان الحصة السابقة أولاً');
                    navigate(`/course/${courseId}`);
                    return;
                }
                
                setAccessChecked(true);
            } catch (err) {
                alert('حدث خطأ في التحقق من إمكانية الوصول للحصة');
                navigate(`/course/${courseId}`);
            }
        };

        checkAccess();
    }, [courseId, lessonId, navigate, isAssignment]);

    useEffect(() => {
        if (!videoUrl && accessChecked) {
            setLoading(true);
            axios.get(`${API_BASE_URL}/api/lecture/${lessonId}`)
                .then(res => {
                    setVideoUrl(res.data.videoUrl);
                    setLoading(false);
                })
                .catch(() => {
                    setError('حدث خطأ في جلب بيانات الدرس');
                    setLoading(false);
                });
        }
    }, [lessonId, videoUrl, accessChecked]);

    if (!accessChecked) return <div className="flex justify-center items-center h-screen w-full">جاري التحقق من إمكانية الوصول...</div>;
    if (loading) return <div className="flex justify-center items-center h-screen w-full">جاري التحميل...</div>;
    if (error) return <div className="flex justify-center items-center h-screen w-full text-red-500">{error}</div>;
    if (!videoUrl) return <div className="flex justify-center items-center h-screen w-full">لا يوجد فيديو مضاف لهذه الحصة</div>;

    return (
        <div className="flex justify-center items-center h-screen w-full">
            <iframe
                className="w-full h-full"
                src={videoUrl}
                title={isAssignment ? "واجب الحصة" : "YouTube video player"}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
            />
        </div>
    );
}
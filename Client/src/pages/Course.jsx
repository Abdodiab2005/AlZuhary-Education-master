import course_poster from '../imgs/course_poster.png'
import Buy_single_lec from "../components/Buy_single_lec";
import Header from "../components/Header";
import Baught_single_lec from '../components/Baught_single_lec';
import Bottom_nav from '../components/Bottom_nav';
import { useState, useEffect, useCallback } from 'react';
import classes from '../css/single_lec.module.css'
import { IoMdAdd } from 'react-icons/io';
import { MdEdit } from 'react-icons/md';
import Delete_btn from '../components/Delete_btn';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import { checkTokenValidity, getAuthHeaders } from '../utils/tokenHandler';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';

export default function Course() {

    const [alert, setAlert] = useState(false);
    const [lesson, setLesson] = useState(false);
    const [course, setCourse] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [purchasedLessons, setPurchasedLessons] = useState([]);
    const [purchasedCourses, setPurchasedCourses] = useState([]);
    const [balance, setBalance] = useState(0);
    const [newLesson, setNewLesson] = useState({ title: '', price: '', videoUrl: '', assignmentUrl: '', viewLimit: 5, viewPrice: 10 });
    const [imageFile, setImageFile] = useState(null);
    const [editLesson, setEditLesson] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', price: '', videoUrl: '', assignmentUrl: '', image: null, viewLimit: 5, viewPrice: 10 });
    const [selectedLesson, setSelectedLesson] = useState(null);
    const userType = localStorage.getItem('userType');
    const { courseId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [watchedLessons, setWatchedLessons] = useState([]);
    const [examScores, setExamScores] = useState([]);
    const [lessonViewCounts, setLessonViewCounts] = useState([]);
    const [forceUpdate, setForceUpdate] = useState(0);
    const [lessonStatuses, setLessonStatuses] = useState({});

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        const initializeData = async () => {
            // التحقق من صلاحية الـ token أولاً
            const isTokenValid = await checkTokenValidity();
            if (!isTokenValid) {
                navigate('/login');
                return;
            }

            const headers = getAuthHeaders();
            
            // التحقق من حالة الخادم أولاً
            axios.get(`${API_BASE_URL}/api/health`)
                .then(() => {
                    // Server is running
                })
                .catch(err => {
                    window.alert('الخادم غير متاح، يرجى المحاولة مرة أخرى');
                });
            
            // جلب رصيد المستخدم
            axios.get(`${API_BASE_URL}/api/recharge/balance`, { headers })
            .then(res => setBalance(res.data.credits || 0))
            .catch(() => setBalance(0));

            // جلب الدروس والكورسات المشتراة
            axios.get(`${API_BASE_URL}/api/auth/me`, { headers })
            .then(res => {
                setPurchasedLessons(res.data.purchasedLessons || []);
                setPurchasedCourses(res.data.purchasedCourses || []);
                setWatchedLessons(res.data.watchedLessons?.map(l => l.lessonId) || []);
                setExamScores(res.data.examScores || []);
                setLessonViewCounts(res.data.lessonViewCounts || []);
            })
            .catch(() => {
                setPurchasedLessons([]);
                setPurchasedCourses([]);
                setWatchedLessons([]);
                setExamScores([]);
            });
        };

        initializeData();

        // جلب بيانات الكورس والدروس
        if (courseId) {
            axios.get(`${API_BASE_URL}/api/courses/${courseId}`)
                .then(res => {
                    setCourse(res.data);
                    setLessons(res.data.lessons || []);
                })
                .catch(() => {
                    setCourse(null);
                    setLessons([]);
                });
        }
        
        // تحديث تلقائي كل 5 ثواني للتأكد من تحديث البيانات
        const interval = setInterval(() => {
            const token = localStorage.getItem('token');
            if (token && courseId) {
                refreshData();
            }
        }, 5000);
        
        return () => clearInterval(interval);
    }, [courseId]);

    // تحديث حالة الدروس عند تغيير نتائج الامتحانات
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && lessons.length > 0 && examScores.length > 0) {
            const fetchUpdatedStatuses = async () => {
                const statuses = {};
                for (const lesson of lessons) {
                    try {
                        const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/lesson-status/${lesson._id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        statuses[lesson._id] = response.data;
                    } catch (err) {
                    }
                }
                setLessonStatuses(statuses);
            };
            // تأخير قليل لتجنب التحديث المتكرر
            const timeoutId = setTimeout(fetchUpdatedStatuses, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [examScores]);

    // تحديث البيانات عند العودة من الامتحان
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && location.pathname.includes('/course/')) {
            // تحديث البيانات عند العودة من الامتحان مرة واحدة فقط
            const refreshData = async () => {
                try {
                    const userRes = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setPurchasedLessons(userRes.data.purchasedLessons || []);
                    setPurchasedCourses(userRes.data.purchasedCourses || []);
                    setWatchedLessons(userRes.data.watchedLessons?.map(l => l.lessonId) || []);
                    setExamScores(userRes.data.examScores || []);
                    setLessonViewCounts(userRes.data.lessonViewCounts || []);
                    
                    // تحديث حالة الدروس
                    if (lessons.length > 0) {
                        const statuses = {};
                        for (const lesson of lessons) {
                            try {
                                const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/lesson-status/${lesson._id}`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                statuses[lesson._id] = response.data;
                            } catch (err) {
                            }
                        }
                        setLessonStatuses(statuses);
                    }
                } catch (err) {
                }
            };
            // تأخير قليل لتجنب التحديث المتكرر
            const timeoutId = setTimeout(refreshData, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [location.pathname]);

    // تحديث تلقائي عند تغيير حالة الدروس
    useEffect(() => {
        // إعادة حساب حالة الوصول للدروس عند تغيير lessonStatuses
        if (Object.keys(lessonStatuses).length > 0) {
            // هذا سيؤدي إلى إعادة حساب canAccessLesson تلقائيًا
            setForceUpdate(prev => prev + 1);
        }
    }, [lessonStatuses]);

    // تحديث تلقائي عند تغيير نتائج الامتحانات
    useEffect(() => {
        if (examScores.length > 0) {
            // تحديث فوري عند تغيير نتائج الامتحانات
            refreshData();
        }
    }, [examScores]);

    // جلب حالة الامتحانات لكل درس
    useEffect(() => {
        updateLessonStatuses();
    }, [courseId, lessons, watchedLessons, examScores]);

    // دالة موحدة لتحديث حالة الدروس
    const updateLessonStatuses = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token || !lessons.length) return;
        
        const statuses = {};
        for (const lesson of lessons) {
            try {
                // استخدام API الجديد للامتحانات
                const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/lesson-status/${lesson._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                statuses[lesson._id] = response.data;
            } catch (err) {
                statuses[lesson._id] = {
                    canAccessLesson: false,
                    canTakeCurrentExam: false,
                    canTakePreviousExam: false,
                    hasPreviousExam: false,
                    isFirstLesson: false
                };
            }
        }
        setLessonStatuses(statuses);
    }, [courseId, lessons]);

    // تحديث lessonStatuses عند تغيير examScores
    useEffect(() => {
        updateLessonStatuses();
    }, [examScores, lessons, courseId]);

    // إعادة رندر عند تغيير lessonStatuses
    useEffect(() => {
        setForceUpdate(prev => prev + 1);
    }, [lessonStatuses]);

    // تحديث البيانات عند العودة من صفحة الفيديو
    useEffect(() => {
        const handleFocus = () => {
            const token = localStorage.getItem('token');
            if (token) {
                axios.get(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                .then(res => {
                    setWatchedLessons(res.data.watchedLessons?.map(l => l.lessonId) || []);
                    setExamScores(res.data.examScores || []);
                    setLessonViewCounts(res.data.lessonViewCounts || []);
                    
                    // تحديث حالة الامتحانات بعد العودة
                    if (lessons.length > 0) {
                        updateLessonStatuses();
                    }
                })
                .catch(err => {
                });
            }
        };

        // تحديث البيانات عند تحميل الصفحة
        handleFocus();
        
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [lessons, courseId]);

    // تحديث lessonStatuses عند تغيير location.pathname (العودة من الامتحان)
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && lessons.length > 0) {
            const fetchUpdatedStatuses = async () => {
                const statuses = {};
                for (const lesson of lessons) {
                    try {
                        // استخدام API الجديد للامتحانات
                        const response = await axios.get(`${API_BASE_URL}/api/courses/${courseId}/lesson-status/${lesson._id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        statuses[lesson._id] = response.data;
                    } catch (err) {
                    }
                }
                setLessonStatuses(statuses);
            };
            // تحديث فوري عند العودة من الامتحان
            fetchUpdatedStatuses();
        }
    }, [location.pathname, lessons, courseId]);

    const handleAddLesson = useCallback(async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newLesson.title);
            formData.append('price', parseInt(newLesson.price) || 0);
            formData.append('videoUrl', newLesson.videoUrl);
            formData.append('assignmentUrl', newLesson.assignmentUrl);
            formData.append('viewLimit', parseInt(newLesson.viewLimit) || 5);
            formData.append('viewPrice', parseInt(newLesson.viewPrice) || 10);
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE_URL}/api/courses/${courseId}/lessons`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            // إضافة الدرس الجديد للمستخدمين الذين اشتروا الكورس
            try {
                const token = localStorage.getItem('token');
                await axios.post(`${API_BASE_URL}/api/courses/${courseId}/add-lesson-to-activated-users`, {
                    lessonId: res.data._id
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
            }

            setLessons(prev => [...prev, res.data]);
            setNewLesson({ title: '', price: '', videoUrl: '', assignmentUrl: '', viewLimit: 5, viewPrice: 10 });
            setImageFile(null);
            setLesson(false);
        } catch (err) {
            window.alert('حدث خطأ أثناء إضافة الدرس');
        }
    }, [courseId, newLesson, imageFile]);

    const handleBuyLesson = useCallback(async (lesson) => {
        const token = localStorage.getItem('token');
        
        if (!token) {
            window.alert('يجب تسجيل الدخول أولاً');
            navigate('/login');
            return;
        }
        
        try {
            // التحقق من صحة الـ token
            try {
                const tokenCheck = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (tokenErr) {
                window.alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                navigate('/login');
                return;
            }
            
            const res = await axios.post(`${API_BASE_URL}/api/courses/${courseId}/lessons/${lesson._id}/buy`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // تحديث الرصيد
            setBalance(res.data.credits);
            
            // إغلاق النافذة المنبثقة
            setAlert(false);
            setSelectedLesson(null);
            
            // تحديث البيانات من الخادم
            const userRes = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setPurchasedLessons(userRes.data.purchasedLessons || []);
            setPurchasedCourses(userRes.data.purchasedCourses || []);
            setWatchedLessons(userRes.data.watchedLessons?.map(l => l.lessonId) || []);
            setExamScores(userRes.data.examScores || []);
            setLessonViewCounts(userRes.data.lessonViewCounts || []);
            
            // تحديث حالة الامتحانات
            if (lessons.length > 0) {
                updateLessonStatuses();
            }
            
            window.alert('تم شراء الدرس بنجاح!');
        } catch (err) {
            if (err.response?.status === 401) {
                window.alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                navigate('/login');
                return;
            }
            
            if (err.response && err.response.data && err.response.data.message) {
                window.alert(err.response.data.message);
            } else {
                window.alert('حدث خطأ أثناء شراء الدرس');
            }
        }
    }, [courseId, navigate, updateLessonStatuses]);

    const handleEditClick = useCallback((lesson) => {
        setEditLesson(lesson);
        setEditForm({
            title: lesson.title || '',
            price: lesson.price || '',
            videoUrl: lesson.videoUrl || '',
            assignmentUrl: lesson.assignmentUrl || '',
            image: null,
            viewLimit: parseInt(lesson.viewLimit) || 5,
            viewPrice: parseInt(lesson.viewPrice) || 10
        });
    }, []);

    const handleEditFormChange = useCallback((e) => {
        const { name, value, files } = e.target;
        if (name === 'image') {
            setEditForm(prev => ({ ...prev, image: files[0] }));
        } else if (name === 'viewLimit') {
            setEditForm(prev => ({ ...prev, [name]: value === '' ? 5 : parseInt(value) || 5 }));
        } else if (name === 'viewPrice') {
            setEditForm(prev => ({ ...prev, [name]: value === '' ? 10 : parseInt(value) || 10 }));
        } else if (name === 'price') {
            setEditForm(prev => ({ ...prev, [name]: value === '' ? '' : parseInt(value) || 0 }));
        } else {
            setEditForm(prev => ({ ...prev, [name]: value }));
        }
    }, []);

    const handleEditSave = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!editLesson || !editLesson._id) {
            window.alert('لم يتم تحديد درس للتعديل');
            return;
        }
        if (!courseId) {
            window.alert('معرف الكورس غير موجود');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('title', editForm.title);
            formData.append('price', parseInt(editForm.price) || 0);
            formData.append('videoUrl', editForm.videoUrl);
            formData.append('assignmentUrl', editForm.assignmentUrl);
            formData.append('viewLimit', parseInt(editForm.viewLimit) || 5);
            formData.append('viewPrice', parseInt(editForm.viewPrice) || 10);
            if (editForm.image) {
                formData.append('image', editForm.image);
            }

            const res = await axios.put(`${API_BASE_URL}/api/courses/${courseId}/lessons/${editLesson._id}`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data', 
                    'Authorization': `Bearer ${token}` 
                }
            });

            setLessons(prev => prev.map(l => l._id === editLesson._id ? res.data : l));
            setEditLesson(null);
            setEditForm({ title: '', price: '', videoUrl: '', assignmentUrl: '', image: null, viewLimit: 5, viewPrice: 10 });
        } catch (err) {
            console.error('Error editing lesson:', err);
            window.alert('حدث خطأ أثناء تعديل الدرس');
        }
    }, [courseId, editLesson, editForm]);

    const handleDeleteLesson = useCallback(async (lessonId) => {
        const token = localStorage.getItem('token');
        if (!courseId) {
            window.alert('معرف الكورس غير موجود');
            return;
        }
        if (window.confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
            try {
                await axios.delete(`${API_BASE_URL}/api/courses/${courseId}/lessons/${lessonId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setLessons(prev => prev.filter(l => l._id !== lessonId));
            } catch (err) {
                console.error('Error deleting lesson:', err);
                window.alert('حدث خطأ أثناء حذف الدرس');
            }
        }
    }, [courseId]);



    // دالة للتحقق من إمكانية الوصول للدرس
    const canAccessLesson = useCallback(async (lessonIndex) => {
        // الدرس الأول متاح دائماً
        if (lessonIndex === 0) return true;
        
        // التحقق من نجاح امتحان الدرس السابق
        const previousLessonId = lessons[lessonIndex - 1]?._id;
        if (!previousLessonId) return false;
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/api/exams/can-access-lesson/${courseId}/${lessons[lessonIndex]._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.canAccess;
        } catch (err) {
            return false;
        }
    }, [courseId, lessons]);

    const getRemainingViews = useCallback((lessonId) => {
        const lesson = lessons.find(l => l._id === lessonId);
        if (!lesson) return 0;

        const viewCount = lessonViewCounts.find(v => v.lessonId === lessonId);
        const currentViews = viewCount ? viewCount.viewCount : 0;
        const viewLimit = lesson.viewLimit || 5;

        return Math.max(0, viewLimit - currentViews);
    }, [lessons, lessonViewCounts]);

    const canTakeCurrentExam = useCallback((lessonId) => {
        // الدرس الأول متاح دائماً
        const lessonIndex = lessons.findIndex(l => l._id === lessonId);
        if (lessonIndex === 0) return true;
        
        // يجب أن يشاهد الفيديو أولاً
        const watched = watchedLessons?.some(l => {
            if (!l) return false;
            const lessonIdToCheck = typeof l === 'object' ? l.lessonId : l;
            return lessonIdToCheck && lessonIdToCheck.toString() === lessonId.toString();
        });
        
        return watched;
    }, [lessons, watchedLessons]);

    const handleCurrentExam = useCallback(async (lessonId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.alert('يرجى تسجيل الدخول مرة أخرى');
                return;
            }
            
            // جلب الامتحانات للدرس
            const response = await axios.get(`${API_BASE_URL}/api/exams/lesson/${lessonId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data && response.data.organized && response.data.organized.current) {
                navigate(`/exam/${lessonId}`, {
                    state: { exam: response.data.organized.current }
                });
            } else {
                window.alert('لا يوجد امتحان حالي لهذا الدرس');
            }
        } catch (error) {
            console.error('خطأ في جلب الامتحان:', error);
            window.alert('حدث خطأ في جلب الامتحان');
        }
    }, [navigate]);

    const handlePreviousExam = useCallback(async (lessonId) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.alert('يرجى تسجيل الدخول مرة أخرى');
                return;
            }
            
            // جلب الامتحانات لنفس الدرس
            const response = await axios.get(`${API_BASE_URL}/api/exams/lesson/${lessonId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data && response.data.organized && response.data.organized.previous) {
                navigate(`/exam/${lessonId}`, {
                    state: { exam: response.data.organized.previous }
                });
            } else {
                window.alert('لا يوجد امتحان سابق لهذا الدرس');
            }
        } catch (error) {
            console.error('خطأ في جلب الامتحان السابق:', error);
            window.alert('حدث خطأ في جلب الامتحان');
        }
    }, [navigate]);

    // تحديث البيانات من الخادم
    const refreshData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const userRes = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setWatchedLessons(userRes.data.watchedLessons?.map(l => l.lessonId) || []);
                setExamScores(userRes.data.examScores || []);
                setLessonViewCounts(userRes.data.lessonViewCounts || []);
                setBalance(userRes.data.credits || 0);

                const balanceRes = await axios.get(`${API_BASE_URL}/api/recharge/balance`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBalance(balanceRes.data.credits || 0);

                // إعادة تحميل البيانات مرة أخرى بعد ثانية للتأكد
                setTimeout(async () => {
                    const finalUserRes = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setWatchedLessons(finalUserRes.data.watchedLessons?.map(l => l.lessonId) || []);
                    setExamScores(finalUserRes.data.examScores || []);
                    setLessonViewCounts(finalUserRes.data.lessonViewCounts || []);
                    setBalance(finalUserRes.data.credits || 0);
                    setForceUpdate(prev => prev + 1);
                    
                    // تحديث حالة الدروس
                    updateLessonStatuses();
                }, 1000);
            } catch (err) {
            }
        }
    }, [updateLessonStatuses]);

    // تحديث البيانات عند تغيير lessonViewCounts أو forceUpdate
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.get(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setWatchedLessons(res.data.watchedLessons || []);
                    setExamScores(res.data.examScores || []);
                    setLessonViewCounts(res.data.lessonViewCounts || []);
                    setBalance(res.data.credits || 0);
                })
                .catch(err => {
                });
        }
    }, [lessonViewCounts, forceUpdate]);

    // شراء مرات مشاهدة إضافية
    const handleBuyViews = useCallback(async (lessonId, numberOfViews) => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/courses/${courseId}/lessons/${lessonId}/buy-views`,
                { numberOfViews },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                window.alert(res.data.message);

                // تحديث البيانات من الخادم
                await refreshData();

                // إعادة تحميل البيانات مرة أخرى بعد ثانية للتأكد
                setTimeout(async () => {
                    await refreshData();
                    setForceUpdate(prev => prev + 1);
                }, 2000);
            }
        } catch (err) {
            if (err.response?.data?.message) {
                window.alert(err.response.data.message);
            } else {
                window.alert('حدث خطأ أثناء شراء مرات المشاهدة');
            }
        }
    }, [courseId, refreshData]);

    // دالة مساعدة لاختبار وجود الامتحانات
    const testExams = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            // اختبار إجمالي الامتحانات
            const totalExamsResponse = await axios.get(`${API_BASE_URL}/api/exams/test-exams`);
            
            // اختبار امتحانات كل درس
            for (const lesson of lessons) {
                const lessonExamsResponse = await axios.get(`${API_BASE_URL}/api/exams/test-lesson-exams/${lesson._id}`);
            }
        } catch (error) {
            console.error('خطأ في اختبار الامتحانات:', error);
        }
    }, [lessons]);

    // إضافة زر اختبار الامتحانات للمطورين
    useEffect(() => {
        if (userType === 'Admin' || userType === 'Teacher') {
            // إضافة زر اختبار في console
            window.testExams = testExams;
        }
    }, [userType, testExams]);

    return <>
        <div className='font-GraphicSchool h-[100hv] w-full  flex flex-col items-center'>
            {/* Heade Section */}
            <div className='fixed top-0 w-[100%] z-10'>
                <Header />
                <div className='text-center bg-white border-4 border-bluetheme-500 lg:border-0 rounded-b-2xl p-1 head2'>
                    <h1 className='head1'>{course ? course.name : 'كورس الشهر الأول'}</h1>
                    <h2>محتوى الكورس</h2>
                </div>
            </div>

            {/* Popup confirmation massage */}
            <div className={`w-[100vw] h-[100vh] fixed top-0 left-0 z-10 flex justify-center items-center ${alert ? `flex` : `hidden`} ${classes.msg}`}>
                <div className={`flex-col justify-center items-center border-4 border-bluetheme-500 rounded-2xl w-[90%] md:w-[60%] lg:w-[30%] fixed top-[40%] bg-white z-10 p-2 gap-2 ${alert ? `flex` : `hidden`}`}>
                    <h2 className='buy bg-bluetheme-500 text-white rounded-lg p-2 '>تأكيد الشراء</h2>
                    <span className='enter flex justify-center items-center gap-0.5'>
                        السعر:
                        <span className='text-bluetheme-500'>{selectedLesson ? selectedLesson.price : ''}</span>
                        جنية
                    </span>
                    <section className='flex justify-center items-center gap-1 course'>
                        <span>الحصة</span>
                    </section>
                    <section className='flex justify-around items-center w-[100%]'>
                        <button className='bg-green-600 text-white rounded-lg p-1 labels' onClick={() => selectedLesson && handleBuyLesson(selectedLesson)}>تأكيد</button>
                        <button className='bg-red-500 text-white rounded-lg p-1 labels' onClick={() => { setAlert(false); setSelectedLesson(null); }}>الغاء</button>
                    </section>
                </div>
            </div>

            {/* Container */}
            <div className='mt-50 md:mt-56 flex flex-wrap items-start justify-center gap-5 md:gap-7 w-[100vw]'>

                {lessons.length === 0 && (
                    <div className='w-full text-center text-gray-400 mt-10'>لا توجد حصص في هذا الكورس حالياً</div>
                )}

                {lessons.map((lesson, idx) => {
                    const lessonIndex = idx; // تعريف lessonIndex
                    // الدرس مفتوح إذا كان المستخدم اشترى الكورس أو اشترى الدرس
                    const courseUnlocked = purchasedCourses.includes(course?._id);
                    // ابحث عن كائن التفعيل لهذا الدرس
                    const lessonActivation = Array.isArray(purchasedLessons)
                        ? purchasedLessons.find(l => {
                            if (!l.lessonId) return false;
                            return l.lessonId.toString() === lesson._id.toString();
                        })
                        : null;
                    
                    // منطق التفعيل المبسط
                    let canAccess = false;
                    if (lessonIndex === 0) {
                        // الدرس الأول متاح دائماً
                        canAccess = true;
                    } else {
                        // للدروس الأخرى، نتحقق من نجاح امتحان الدرس السابق
                        const previousLessonId = lessons[lessonIndex - 1]?._id;
                        if (previousLessonId) {
                            // البحث عن نتيجة امتحان الدرس السابق
                            const previousExamScore = examScores.find(score => {
                                // التحقق من أن score هو كائن أو قيمة مباشرة
                                if (typeof score === 'object' && score.lessonId) {
                                    return score.lessonId.toString() === previousLessonId.toString();
                                } else if (typeof score === 'string') {
                                    return score.toString() === previousLessonId.toString();
                                }
                                return false;
                            });
                            
                            if (previousExamScore) {
                                // إذا كان هناك امتحان سابق، نتحقق من النتيجة
                                let score = 0;
                                if (typeof previousExamScore === 'object' && previousExamScore.score !== undefined) {
                                    score = previousExamScore.score;
                                } else if (typeof previousExamScore === 'number') {
                                    score = previousExamScore;
                                }
                                canAccess = score >= 50; // نجاح بنسبة 50%+
                                
                                // تشخيص: طباعة معلومات الدرس والامتحان
                                if (lesson.title === 'الدرس الثاني' || lesson.title.includes('ثاني')) {
                                    console.log('🔍 تشخيص الدرس الثاني:', {
                                        lessonId: lesson._id,
                                        previousLessonId,
                                        examScores,
                                        previousExamScore,
                                        score,
                                        canAccess
                                    });
                                }
                            } else {
                                // إذا لم يكن هناك امتحان سابق، نفتح الدرس مباشرة
                                canAccess = true;
                            }
                        } else {
                            canAccess = true;
                        }
                    }
                    
                    const lessonUnlocked = courseUnlocked || (lessonActivation && (lessonActivation.video || lessonActivation.assignment)) || canAccess;
                    
                    // إضافة forceUpdate لضمان تحديث الأزرار
                    const key = `${lesson._id}-${forceUpdate}`;
                    
                    // منطق إظهار الفيديو والواجب
                    const showVideo = lessonUnlocked && lesson.videoUrl;
                    const showAssignment = true; // زر الواجب يظهر دائماً
                    
                    // التحقق من أن الدرس مشترى (للتحكم في عرض زر الشراء)
                    const isLessonPurchased = courseUnlocked || (lessonActivation && (lessonActivation.video || lessonActivation.assignment));
                    

                    
                    // منطق تفعيل زر امتحان الحصة السابقة
                    let canTakePreviousExamBtn = true; // مفعل دائماً
                    // إذا لم يكن هناك امتحان سابق، سيظهر رسالة "لا يوجد امتحان سابق لهذا الدرس"
                    
                    // منطق تفعيل زر امتحان الحصة الحالية
                    let canTakeCurrentExamBtn = false;
                    if (idx === 0) {
                        // الدرس الأول متاح دائماً للامتحان
                        canTakeCurrentExamBtn = true;
                    } else {
                        // يمكن أخذ الامتحان إذا كنت قد شاهدت الدرس (عدد المشاهدات أقل من العدد الأساسي)
                        const remainingViews = getRemainingViews(lesson._id);
                        const viewLimit = lesson.viewLimit || 5;
                        canTakeCurrentExamBtn = remainingViews < viewLimit; // إذا كان عدد المشاهدات أقل من الحد الأقصى
                    }
                    
                    return (
                        <div key={key} className='flex flex-col justify-center items-center rounded-2xl w-[60%] rounded-t-2xl mb-20 md:w-[40%] lg:w-[80%] lg:flex-row-reverse'>
                            <div className='w-[100%] h-[240px] lg:w-[50%] lg:h-[240px] lg:rounded-[0] lg:rounded-l-2xl relative'>
                                {lesson.image ? (
                                    <img src={`${API_BASE_URL}${lesson.image}`} className='rounded-t-2xl w-full h-full lg:rounded-[0] lg:rounded-l-2xl object-cover' alt='' />
                                ) : (
                                    <img src={course_poster} className='rounded-t-2xl w-full h-full lg:rounded-[0] lg:rounded-l-2xl' alt='' />
                                )}
                                {/* Edit Lesson Data */}
                                {(userType === 'Admin' || userType === 'Teacher') && (
                                    <button className='absolute top-1 right-2 p-2 rounded-xl bg-bluetheme-500 text-white text-xl md:text-2xl font-GraphicSchool' onClick={() => handleEditClick(lesson)}><MdEdit /></button>
                                )}
                                {/* Lock Icon */}
                                {!(showVideo || lesson.assignmentUrl) && (
                                    <span className='absolute top-2 left-2 bg-white rounded-full p-2 shadow'><FaLock className='text-gray-500 text-xl' /></span>
                                )}
                            </div>
                            <div className='flex flex-col items-center justify-center p-3 rounded-b-2xl bg-bluetheme-500 gap-2.5 relative w-full lg:rounded-[0] lg:rounded-r-2xl lg:p-1.5 lg:h-full'>
                                <h2 className='bg-white text-bluetheme-500 p-1.5 lg:p-1 rounded-lg w-[50%] text-center head2'>{lesson.title}</h2>
                                <span className='bg-white p-1.5 rounded-lg text-center labels'>السعر: {lesson.price} جنيه</span>
                                {(showVideo || lesson.assignmentUrl) ? (
                                    <>
                                        {lesson.assignmentUrl && (
                                            <button className='absolute top-[100%] text-bluetheme-500 rounded-b-2xl border-4 border-t-0 p-3 border-bluetheme-500 text-center transition-all duration-[0.2s] ease-in-out hover:bg-bluetheme-500 hover:text-white'
                                                onClick={() => navigate(`/course/${courseId}/lesson/${lesson._id}`, { state: { videoUrl: lesson.assignmentUrl, isAssignment: true } })}>
                                                واجب الحصة
                                            </button>
                                        )}
                                        {showVideo && (
                                            <div className='flex flex-col items-center gap-2'>
                                                <button
                                                    className={`rounded-lg p-1 enter mt-2 transition-all duration-300 ${getRemainingViews(lesson._id) > 0 && canAccess
                                                        ? 'bg-green-700 text-white hover:bg-green-800'
                                                        : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                                        }`}
                                                    onClick={() => {
                                                        if (getRemainingViews(lesson._id) <= 0) {
                                                            window.alert('انتهت مرات المشاهدة المسموحة لهذا الدرس');
                                                            return;
                                                        }

                                                        // التحقق من نجاح الامتحان السابق
                                                        if (!canAccess) {
                                                            window.alert('يجب نجاح امتحان الحصة السابقة أولاً (50%+)');
                                                            return;
                                                        }

                                                        // تسجيل مشاهدة الدرس
                                                        const token = localStorage.getItem('token');
                                                        axios.post(`${API_BASE_URL}/api/courses/${courseId}/lessons/${lesson._id}/watch`, {}, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                        }).then((response) => {
                                                            // تحديث البيانات من الخادم مباشرة
                                                            const token = localStorage.getItem('token');
                                                            axios.get(`${API_BASE_URL}/api/auth/me`, {
                                                                headers: { Authorization: `Bearer ${token}` }
                                                            })
                                                            .then(res => {
                                                                setWatchedLessons(res.data.watchedLessons?.map(l => l.lessonId) || []);
                                                                setExamScores(res.data.examScores || []);
                                                                setLessonViewCounts(res.data.lessonViewCounts || []);
                                                                
                                                                                    // تحديث حالة الامتحانات بعد مشاهدة الدرس
                    if (lessons.length > 0) {
                        updateLessonStatuses();
                    }
                                                            })
                                                            .catch(err => {
                                                            });
                                                        }).catch(err => {
                                                            if (err.response?.status === 403) {
                                                                window.alert(err.response.data.message);
                                                            }
                                                        });
                                                        
                                                        navigate(`/course/${courseId}/lesson/${lesson._id}`, { state: { videoUrl: lesson.videoUrl } });
                                                    }}
                                                    disabled={getRemainingViews(lesson._id) <= 0 || !canAccess}
                                                >
                                                    {getRemainingViews(lesson._id) <= 0 ? 'انتهت مرات المشاهدة' : (canAccess ? 'دخول الحصة' : 'يجب نجاح امتحان الحصة السابقة (50%+)')}
                                                </button>
                                                <span className={`text-xs ${getRemainingViews(lesson._id) <= 0 ? 'text-red-500' : 'text-gray-600'}`}>
                                                    متبقي: {getRemainingViews(lesson._id)} مشاهدة
                                                </span>
                                                {/* زر شراء مرات مشاهدة إضافية */}
                                                {getRemainingViews(lesson._id) <= 0 && (
                                                    <div className='flex flex-col items-center gap-1 mt-2'>
                                                        <span className='text-xs text-gray-600'>
                                                            سعر المرة: {lesson.viewPrice || 10} جنيه
                                                        </span>
                                                        <div className='flex items-center gap-1'>
                                                            <input 
                                                                type="number" 
                                                                min="1" 
                                                                max="10"
                                                                defaultValue="1"
                                                                className='w-12 h-6 text-xs text-center border rounded'
                                                                id={`views-${lesson._id}`}
                                                            />
                                                            <button 
                                                                className='bg-orange-500 text-white text-xs px-2 py-1 rounded hover:bg-orange-600'
                                                                onClick={() => {
                                                                    const input = document.getElementById(`views-${lesson._id}`);
                                                                    const numberOfViews = parseInt(input.value) || 1;
                                                                    if (numberOfViews > 0 && numberOfViews <= 10) {
                                                                        handleBuyViews(lesson._id, numberOfViews);
                                                                    } else {
                                                                        window.alert('يرجى إدخال عدد صحيح بين 1 و 10');
                                                                    }
                                                                }}
                                                            >
                                                                شراء مرات
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <button onClick={() => { setSelectedLesson(lesson); setAlert(true); }}>
                                        <Buy_single_lec />
                                    </button>
                                )}

                                {/*--------------Last Edit--------------*/}
                                {/* زرار الامتحان */}
                                <div className='w-[100%] flex flex-col justify-center items-center gap-1 lg:flex-row lg:gap-2'>
                                    <button 
                                        className={`${canTakePreviousExamBtn 
                                            ? 'bg-amber-400 hover:bg-amber-500 cursor-pointer' 
                                            : 'bg-gray-400 cursor-not-allowed opacity-50'} text-black md:text-[0.95rem] lg:text-[1rem] p-1 rounded-lg text-[0.8rem]`}
                                        disabled={!canTakePreviousExamBtn}
                                        onClick={() => handlePreviousExam(lesson._id)}
                                    >
                                        امتحان الحصة السابقة
                                    </button>
                                    <button 
                                        className={`${canTakeCurrentExamBtn 
                                            ? 'bg-amber-400 hover:bg-amber-500 cursor-pointer' 
                                            : 'bg-gray-400 cursor-not-allowed opacity-50'} text-black md:text-[0.95rem] lg:text-[1rem] p-1 rounded-lg text-[0.8rem]`}
                                        disabled={!canTakeCurrentExamBtn}
                                        onClick={() => handleCurrentExam(lesson._id)}
                                    >
                                        امتحان الحصة الحالية
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Bottom_nav />

            {/* Add lectuer Button */}
            {(userType === 'Admin' || userType === 'Teacher') && (
                <button className='fixed bottom-11 right-5 bg-green-500 buttons flex justify-center items-center  gap-2 p-2 rounded-xl font-bold text-2xl hover:bg-green-650 hover:text-white transition-all duration-[0.2s] font-GraphicSchool' onClick={() => { setLesson(true) }}>
                    <span className='hidden lg:inline-block'>اضافة درس</span>
                    <IoMdAdd />
                </button>
            )}

            {/* Lectuer Data Form */}
            <div className={`w-[100vw] h-[100vh] fixed top-0 left-0 z-10 flex justify-center items-center ${lesson ? `flex` : `hidden`} ${classes.msg} `}>
                <form className='bg-white border-4 border-bluetheme-500 rounded-2xl p-3 flex flex-col justify-center items-center gap-3' onSubmit={handleAddLesson}>
                    <h2 className='head1 text-bluetheme-500'>اضافة درس جديد</h2>
                    <div className='flex flex-col lg:flex-row-reverse items-center justify-center lg:justify-between bg-bluetheme-500 rounded-2xl'>

                        {/* Lesson Poster */}
                        <label htmlFor="upload-img" className='cursor-pointer bg-gray-500 text-white w-full rounded-t-2xl flex flex-col lg:text-xl font-extrabold text-center items-center justify-center text-2xl p-15  lg:h-[100%] lg:w-[40%] lg:rounded-r-[0] lg:rounded-l-2xl gap-2 font-GraphicSchool'>
                            <IoMdAdd />
                            اضافة صورة
                        </label>
                        <input type="file" accept='image/*' id='upload-img' className='hidden' onChange={e => setImageFile(e.target.files[0])} />

                        {/* Lesson Text Data */}
                        <div className='flex flex-col items-center justify-center gap-5 p-2'>
                            <input type="text" placeholder='عنوان الدرس' className='bg-white text-bluetheme-500  w-[60%] text-xl text-center rounded-lg p-0.5' value={newLesson.title} onChange={e => setNewLesson({ ...newLesson, title: e.target.value })} />
                            <input type="number" placeholder='سعر الحصة' className='bg-white text-black rounded-md w-[40%] p-0.5 text-center' value={newLesson.price} onChange={e => setNewLesson({ ...newLesson, price: e.target.value })} />
                            <input type="text" placeholder='عدد مرات المشاهدة المسموحة' className='bg-white text-black rounded-md w-[40%] p-0.5 text-center text-xs' value={newLesson.viewLimit} onChange={e => setNewLesson({ ...newLesson, viewLimit: e.target.value === '' ? '' : parseInt(e.target.value) || 5 })} />
                            <input type="text" placeholder='سعر مرة المشاهدة الإضافية' className='bg-white text-black rounded-md w-[40%] p-0.5 text-center text-xs' value={newLesson.viewPrice} onChange={e => setNewLesson({ ...newLesson, viewPrice: e.target.value === '' ? '' : parseInt(e.target.value) || 10 })} />
                            <input type="url" placeholder='URL الحصة' className='w-[90%] rounded-3xl text-center text-black bg-white p-0.5 text-md' value={newLesson.videoUrl} onChange={e => setNewLesson({ ...newLesson, videoUrl: e.target.value })} />
                            <input type="url" placeholder='URL الواجب' className='w-[90%] rounded-3xl text-center text-black bg-white p-0.5 text-md' value={newLesson.assignmentUrl} onChange={e => setNewLesson({ ...newLesson, assignmentUrl: e.target.value })} />
                        </div>

                    </div>
                    {/* Save & Delete Button */}
                    <div className='flex justify-center items-center gap-3'>
                        <button type="submit" className='bg-green-500 hover:bg-green-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5'>حفظ</button>
                        <button type="button" className='bg-red-500 hover:bg-red-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5' onClick={() => { setLesson(false); setNewLesson({ title: '', price: '', videoUrl: '', assignmentUrl: '', viewLimit: 5, viewPrice: 10 }); setImageFile(null); }}>إلغاء</button>
                    </div>
                </form>
            </div>

            {/* Edit Lesson Modal */}
            {(userType === 'Admin' || userType === 'Teacher') && editLesson && (
                <div className={`w-[100vw] h-[100vh] fixed top-0 left-0 z-10 flex justify-center items-center flex ${classes.msg}`}>
                    <form className='bg-white border-4 border-bluetheme-500 rounded-2xl p-3 flex flex-col justify-center items-center gap-3' onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
                        <h2 className='head1 text-bluetheme-500'>تعديل بيانات الدرس</h2>
                        <div className='flex flex-col lg:flex-row-reverse items-center justify-center lg:justify-between bg-bluetheme-500 rounded-2xl'>
                            {/* Lesson Poster */}
                            <label htmlFor="edit-upload-img" className='cursor-pointer bg-gray-500 text-white w-full rounded-t-2xl flex flex-col lg:text-xl font-extrabold text-center items-center justify-center text-2xl p-15  lg:h-[100%] lg:w-[40%] lg:rounded-r-[0] lg:rounded-l-2xl gap-2 font-GraphicSchool'>
                                <IoMdAdd />
                                {editLesson.image ? 'تغيير الصورة' : 'إضافة صورة'}
                            </label>
                            <input type="file" accept='image/*' id='edit-upload-img' name="image" className='hidden' onChange={handleEditFormChange} />
                            {/* Lesson Text Data */}
                            <div className='flex flex-col items-center justify-center gap-5 p-2'>
                                <input type="text" name="title" placeholder='عنوان الدرس' className='bg-white text-bluetheme-500  w-[60%] text-xl text-center rounded-lg p-0.5' value={editForm.title} onChange={handleEditFormChange} />
                                <input type="number" name="price" placeholder='سعر الحصة' className='bg-white text-black rounded-md w-[40%] p-0.5 text-center' value={editForm.price} onChange={handleEditFormChange} />
                                <input type="text" name="viewLimit" placeholder='عدد مرات المشاهدة المسموحة' className='bg-white text-black rounded-md w-[40%] p-0.5 text-center text-xs' value={editForm.viewLimit} onChange={handleEditFormChange} />
                                <input type="text" name="viewPrice" placeholder='سعر مرة المشاهدة الإضافية' className='bg-white text-black rounded-md w-[40%] p-0.5 text-center text-xs' value={editForm.viewPrice} onChange={handleEditFormChange} />
                                <input type="url" name="videoUrl" placeholder='URL الحصة' className='w-[90%] rounded-3xl text-center text-black bg-white p-0.5 text-md' value={editForm.videoUrl} onChange={handleEditFormChange} />
                                <input type="url" name="assignmentUrl" placeholder='URL الواجب' className='w-[90%] rounded-3xl text-center text-black bg-white p-0.5 text-md' value={editForm.assignmentUrl} onChange={handleEditFormChange} />
                            </div>
                        </div>
                        {/* Save & Delete Button */}
                        <div className='flex justify-center items-center gap-3'>
                            <button type="submit" className='bg-green-500 hover:bg-green-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5'>حفظ</button>
                            <button type="button" className='bg-red-500 hover:bg-red-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5' onClick={() => handleDeleteLesson(editLesson._id)}>حذف</button>
                            <button type="button" className='bg-gray-400 hover:bg-gray-500 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5' onClick={() => setEditLesson(null)}>إلغاء</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    </>
}
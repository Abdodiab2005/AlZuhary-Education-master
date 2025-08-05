import Buy_full_course from '../components/Buy_full_course'
import course_poster from '../imgs/course_poster.png'
import Baught_full_course from "../components/Baught_full_course";
import { Link, useNavigate } from "react-router-dom";
import Bottom_nav from "../components/Bottom_nav";
import Header from "../components/Header";
import { useState, useEffect } from 'react';
import classes from '../css/playlist.module.css'
import { MdEdit } from 'react-icons/md';
import { IoMdAdd } from 'react-icons/io';
import Delete_btn from '../components/Delete_btn';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import { checkTokenValidity, getAuthHeaders } from '../utils/tokenHandler';

export default function Index() {

    const [alert, setAlert] = useState(false);
    const [playlist, setPlaylist] = useState(false);
    const [balance, setBalance] = useState(0);
    const [courses, setCourses] = useState([]);
    const [newCourse, setNewCourse] = useState({ name: '', price: '', image: '', description: '', grade: '' });
    const [imageFile, setImageFile] = useState(null);
    const userType = localStorage.getItem('userType');
    const userGrade = localStorage.getItem('year_stage');
    const [purchasedCourses, setPurchasedCourses] = useState([]);
    const [editCourse, setEditCourse] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', price: '', image: null, description: '', grade: '' });
    const navigate = useNavigate();

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
            if (Object.keys(headers).length > 0) {
                axios.get(`${API_BASE_URL}/api/recharge/balance`, { headers })
                .then(res => setBalance(res.data.credits || 0))
                .catch(() => setBalance(0));
                
                axios.get(`${API_BASE_URL}/api/auth/me`, { headers })
                .then(res => setPurchasedCourses(res.data.purchasedCourses || []))
                .catch(() => setPurchasedCourses([]));
            }
            
            // جلب الكورسات حسب نوع المستخدم
            const coursesEndpoint = (userType === 'Admin' || userType === 'Teacher') 
                ? `${API_BASE_URL}/api/courses/all` 
                : `${API_BASE_URL}/api/courses`;
                
            axios.get(coursesEndpoint, { headers })
                .then(res => {
                    // التأكد من أن كل كورس يحتوي على الدروس
                    const coursesWithLessons = res.data.map(course => ({
                        ...course,
                        lessons: course.lessons || []
                    }));
                    setCourses(coursesWithLessons);
                })
                .catch(() => setCourses([]));
        };

        initializeData();
    }, [navigate]);

    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('name', newCourse.name);
            formData.append('price', newCourse.price);
            if (imageFile) {
                formData.append('image', imageFile);
            }
            formData.append('description', newCourse.description);
            formData.append('grade', newCourse.grade);
            const res = await axios.post(`${API_BASE_URL}/api/courses`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            setCourses([...courses, { ...res.data, lessons: res.data.lessons || [] }]);
            setNewCourse({ name: '', price: '', image: '', description: '', grade: '' });
            setImageFile(null);
            setPlaylist(false);
        } catch (err) {
            window.alert('حدث خطأ أثناء إضافة الكورس');
        }
    };

    const handleBuyCourse = async (course) => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/courses/${course._id}/buy`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(res.data.credits);
            setPurchasedCourses([...purchasedCourses, course._id]);
            setAlert(false);
            window.alert('تم شراء الكورس بنجاح!');
            window.location.reload();
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                window.alert(err.response.data.message);
            } else {
                window.alert('حدث خطأ أثناء شراء الكورس');
            }
        }
    };

    const handleEditClick = (course) => {
        setEditCourse(course);
        setEditForm({
            name: course.name || '',
            price: course.price || '',
            image: null,
            description: course.description || '',
            grade: course.grade || ''
        });
    };

    const handleEditFormChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'image') {
            setEditForm({ ...editForm, image: files[0] });
        } else {
            setEditForm({ ...editForm, [name]: value });
        }
    };

    const handleEditSave = async () => {
        try {
            const formData = new FormData();
            formData.append('name', editForm.name);
            formData.append('price', editForm.price);
            if (editForm.image) {
                formData.append('image', editForm.image);
            }
            formData.append('description', editForm.description);
            const res = await axios.put(`${API_BASE_URL}/api/courses/${editCourse._id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setCourses(courses => courses.map(c => c._id === editCourse._id ? { ...res.data, lessons: res.data.lessons || c.lessons || [] } : c));
            setEditCourse(null);
        } catch (err) {
            window.alert('حدث خطأ أثناء تعديل الكورس');
        }
    };

    const handleDeleteCourse = async () => {
        if (window.confirm('هل أنت متأكد من حذف هذا الكورس؟')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_BASE_URL}/api/courses/${editCourse._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCourses(courses => courses.filter(c => c._id !== editCourse._id));
                setEditCourse(null);
                window.alert('تم حذف الكورس بنجاح!');
            } catch (err) {
                window.alert('حدث خطأ أثناء حذف الكورس');
            }
        }
    };

    return <>
        <div className='h-screen font-GraphicSchool'>

            {/* Head Section */}
            <div className='fixed top-0 w-[100%] z-10'>
                <Header />
                <div className='text-center bg-white border-4 border-bluetheme-500 lg:border-0 rounded-b-2xl p-1 head1'>
                    <h1 className='text-bluetheme-500 head2'>مرحبا , {localStorage.getItem('userName') || ''}</h1>
                    <h1>الكورسات</h1>
                </div>
            </div>

            {/* Cards Container */}
            <div className='h-fit flex flex-wrap justify-center items-start gap-15 md:mt-56 mt-50 relative'>
                {/* عرض السنة الدراسية للطالب */}
                {userType === 'Student' && userGrade && (
                    <div className="w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg mb-4">
                        <span className="text-lg font-bold">السنة الدراسية: {userGrade}</span>
                    </div>
                )}

                {/* Popup confirmation massage */}
                <div className={`w-[100vw] h-[100vh] fixed top-0 left-0 z-10 flex justify-center items-center ${alert ? `flex` : `hidden`} ${classes.msg}`}>
                    <div className={`flex-col justify-center items-center border-4 border-bluetheme-500 rounded-2xl w-[90%] md:w-[60%] lg:w-[30%] fixed bg-white z-10 p-2 gap-2 ${alert ? `flex` : `hidden`}`}>
                        <h2 className='buy bg-bluetheme-500 text-white rounded-lg p-2 '>تأكيد الشراء</h2>
                        <span className='enter flex justify-center items-center gap-0.5'>
                            السعر:
                            <span className='text-bluetheme-500'>{alert && alert.price ? alert.price : ''}</span>
                            جنية
                        </span>
                        <section className='flex justify-center items-center gap-1 course'>
                            <span>كورس</span>
                            <span className='text-bluetheme-500'>{alert && alert.name ? alert.name : ''}</span>
                        </section>
                        <section className='flex justify-around items-center w-[100%]'>
                            <button className='bg-green-600 text-white rounded-lg p-1 labels' onClick={() => handleBuyCourse(alert.course)}>تأكيد</button>
                            <button className='bg-red-500 text-white rounded-lg p-1 labels' onClick={() => { setAlert(false) }}>الغاء</button>
                        </section>
                    </div>
                </div>

                {courses.length === 0 && (
                    <div className='w-full text-center text-gray-400 mt-10'>
                        {userType === 'Student' ? 
                            'لا توجد كورسات متاحة لسنتك الدراسية حالياً' : 
                            'لا يوجد كورسات مضافة بعد'
                        }
                    </div>
                )}
                {courses.map((course, idx) => {
                    const isPurchased = purchasedCourses.includes(course._id);
                    return (
                    <div key={idx} className='flex flex-col justify-center items-center rounded-2xl w-[300px] md:w-[280px] lg:w-[320px] relative mb-8 font-GraphicSchool'>
                        <div className='relative flex items-center justify-center w-[110%] h-[200px] rounded-2xl overflow-hidden'>
                            {course.image ? (
                                <img src={`${API_BASE_URL}${course.image}`} className='w-[90%] md:w-full h-full rounded-2xl object-cover' alt='course' />
                            ) : (
                                <img src='/imgs/placeholder.png' className='w-full h-full rounded-2xl object-cover' alt='no course' />
                            )}
                            {/* زر تعديل بيانات الكورس */}
                            {(userType === 'Admin' || userType === 'Teacher') && (
                                <button className='absolute top-1 right-6 md:right-2 p-2 rounded-xl bg-bluetheme-500 text-white text-xl md:text-2xl font-GraphicSchool' onClick={() => handleEditClick(course)}><MdEdit /></button>
                            )}
                        </div>
                        <div className='w-[85%] md:w-[90%] bg-white border-4 border-bluetheme-500 rounded-xl -translate-y-12 text-center p-2 flex flex-col justify-center items-center gap-2 shadow-lg'>
                            <h1 className='bg-bluetheme-500 text-white p-2 w-[90%] rounded-lg course text-xl head2'>{course.name}</h1>
                            {course.grade && (
                                <span className='bg-blue-600 text-white px-2 py-1 rounded-lg text-sm'>{course.grade}</span>
                            )}
                            {course.description && (
                                <p className='text-gray-700 text-sm mt-1 mb-2'>{course.description}</p>
                            )}
                            <span className='content text-gray-700'>يتكون الكورس من {course.lessons && Array.isArray(course.lessons) ? course.lessons.length : 0} محاضرات</span>
                            <span className='content text-gray-700'>محاضرة اسبوعيا - الواجبات</span>
                            <button className='bg-bluetheme-500 text-white rounded-lg p-1 enter mt-1 mb-1 labels' onClick={() => window.location.assign(`/course/${course._id}`)}>دخول الكورس</button>
                            <span className='bg-bluetheme-500 rounded-[10px] flex justify-center items-center p-1 gap-2 text-white month_price mt-1 mb-1'>
                                <span className='bg-white text-black rounded-l-xl rounded-r-xl pr-[8px] pl-[8px] text-lg'>{course.price}</span>
                                جنيها
                            </span>
                            {/* زر شراء */}
                            {!isPurchased ? (
                                <span onClick={() => setAlert({ price: course.price, name: course.name, course })} className='mt-1 mb-1' style={{display: 'inline-block', cursor: 'pointer'}}>
                                    <Buy_full_course />
                                </span>
                            ) : (
                                <span className='mt-1 mb-1'>
                                    <Baught_full_course />
                                </span>
                            )}
                        </div>
                    </div>
                )})}

            </div>
            {/* Bottom Nav */}
            <Bottom_nav />

            {/* Add Playlist Button */}
            {(userType === 'Admin' || userType === 'Teacher') && (
                <button className='fixed bottom-12 lg:bottom-3 right-1 lg:right-2 bg-green-500 buttons flex justify-center items-center  gap-2 p-2 rounded-xl text-xl hover:bg-green-650 hover:text-white transition-all duration-[0.2s] font-GraphicSchool' onClick={() => { setPlaylist(true) }}>
                    <span className='hidden lg:inline-block'>اضافة كورس</span>
                    <IoMdAdd />
                </button>
            )}

            {/* Playlist Data Form */}
            <div className={`w-[100vw] h-[100vh] fixed top-0 left-0 z-10 flex justify-center items-center ${playlist ? `flex` : `hidden`} ${classes.msg} `}>
                <form className='bg-white border-4 border-bluetheme-500 rounded-2xl p-3 flex flex-col justify-center items-center gap-3' onSubmit={handleAddCourse}>
                    <h2 className='head1 text-bluetheme-500'>اضافة كورس جديد</h2>
                    <div className='flex flex-col lg:flex-row-reverse items-center justify-center lg:justify-between bg-bluetheme-500 rounded-2xl'>

                        {/* playlist Poster */}
                        <label htmlFor="upload-img" className='cursor-pointer bg-gray-500 text-white w-full rounded-t-2xl flex flex-col lg:text-xl font-extrabold text-center items-center justify-center text-2xl p-15  lg:h-[100%] lg:w-[40%] lg:rounded-r-[0] lg:rounded-l-2xl gap-2 font-GraphicSchool'>
                            <IoMdAdd />
                            اضافة صورة
                        </label>
                        <input type="file" accept='image/*' id='upload-img' className='hidden' onChange={e => setImageFile(e.target.files[0])} />

                        {/* playlist Text Data */}
                        <div className='flex flex-col items-center justify-center gap-5 p-2'>
                            <input type="text" placeholder='عنوان الكورس' className='bg-white text-bluetheme-500  w-[60%] text-xl text-center rounded-lg p-0.5' value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })} />

                            {/* وصف الكورس التعديل الجديد */}
                            <input type="text" placeholder='وصف الكورس' className='bg-white text-black w-[70%] text-xl text-center rounded-lg p-0.5' value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
                            <input type="number" placeholder='سعر الكورس' className='bg-white text-black rounded-md w-[50%] p-0.5 text-center' value={newCourse.price} onChange={e => setNewCourse({ ...newCourse, price: e.target.value })} />
                            
                            {/* حقل السنة الدراسية */}
                            <select 
                                className='bg-white text-black rounded-md w-[70%] p-0.5 text-center' 
                                value={newCourse.grade} 
                                onChange={e => setNewCourse({ ...newCourse, grade: e.target.value })}
                                required
                            >
                                <option value="">اختر السنة الدراسية</option>
                                <option value="أولى ثانوي">أولى ثانوي</option>
                                <option value="تانية ثانوي">تانية ثانوي</option>
                                <option value="تالتة ثانوي">تالتة ثانوي</option>
                            </select>
                        </div>

                    </div>
                    {/* Save & Delete Button */}
                    <div className='flex justify-center items-center gap-3'>
                        <button type="submit" className='bg-green-500 hover:bg-green-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5'>حفظ</button>
                        <button type="button" className='bg-red-500 hover:bg-red-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5' onClick={() => { setPlaylist(false); setNewCourse({ name: '', price: '', image: '', description: '' }); setImageFile(null); }}>إلغاء</button>

                        {/* Only used in Editing Cases */}
                        <Delete_btn />
                    </div>
                </form>
            </div>

            {/* Edit Course Modal */}
            {(userType === 'Admin' || userType === 'Teacher') && editCourse && (
                <div className={`w-[100vw] h-[100vh] fixed top-0 left-0 z-10 flex justify-center items-center flex ${classes.msg}`}>
                    <div className='bg-white border-4 border-bluetheme-500 rounded-2xl p-3 flex flex-col justify-center items-center gap-3'>
                        <h2 className='head1 text-bluetheme-500'>تعديل بيانات الكورس</h2>
                        <div className='flex flex-col lg:flex-row-reverse items-center justify-center lg:justify-between bg-bluetheme-500 rounded-2xl'>

                            {/* Course Poster */}
                            <label htmlFor="edit-upload-img" className='cursor-pointer bg-gray-500 text-white w-full rounded-t-2xl flex flex-col lg:text-xl font-extrabold text-center items-center justify-center text-2xl p-15  lg:h-[100%] lg:w-[40%] lg:rounded-r-[0] lg:rounded-l-2xl gap-2 font-GraphicSchool'>
                                <IoMdAdd />
                                تغيير الصورة
                            </label>
                            <input type="file" accept='image/*' id='edit-upload-img' className='hidden' name="image" onChange={handleEditFormChange} />

                            {/* Course Text Data */}
                            <div className='flex flex-col items-center justify-center gap-5 p-2'>
                                <input type="text" placeholder='عنوان الكورس' name="name" value={editForm.name} onChange={handleEditFormChange} className='bg-white text-bluetheme-500  w-[60%] text-xl text-center rounded-lg p-0.5' />
                                <input type="text" placeholder='وصف الكورس' name="description" value={editForm.description} onChange={handleEditFormChange} className='bg-white text-black w-[70%] text-xl text-center rounded-lg p-0.5' />
                                <input type="number" placeholder='سعر الكورس' name="price" value={editForm.price} onChange={handleEditFormChange} className='bg-white text-black rounded-md w-[50%] p-0.5 text-center' />
                                
                                {/* حقل السنة الدراسية للتعديل */}
                                <select 
                                    name="grade"
                                    className='bg-white text-black rounded-md w-[70%] p-0.5 text-center' 
                                    value={editForm.grade} 
                                    onChange={handleEditFormChange}
                                    required
                                >
                                    <option value="">اختر السنة الدراسية</option>
                                    <option value="أولى ثانوي">أولى ثانوي</option>
                                    <option value="تانية ثانوي">تانية ثانوي</option>
                                    <option value="تالتة ثانوي">تالتة ثانوي</option>
                                </select>
                            </div>

                        </div>
                        {/* Save & Cancel Button */}
                        <div className='flex justify-center items-center gap-3'>
                            <button type="button" className='bg-green-500 hover:bg-green-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5' onClick={handleEditSave}>حفظ</button>
                            <button type="button" className='bg-red-500 hover:bg-red-600 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5' onClick={handleDeleteCourse}>حذف</button>
                            <button type="button" className='bg-gray-400 hover:bg-gray-500 hover:text-white transition-all duration-[0.2s] rounded-xl p-1.5 text-xl pr-2 pl-2 mt-3 mb-1.5' onClick={() => setEditCourse(null)}>إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </>
}
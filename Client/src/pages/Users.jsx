import { MdDelete, MdEdit } from "react-icons/md";
import classes from '../css/users.module.css'
import { useState, useEffect } from "react";
import Active_btn from "../components/Active_btn";
import NotActive from "../components/NotActive";
import { IoSearch } from "react-icons/io5";
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import { checkTokenValidity, getAuthHeaders } from '../utils/tokenHandler';
import Bottom_nav from "../components/Bottom_nav";
import { useNavigate } from "react-router-dom";

export default function Users() {
    const [active, setActive] = useState(false);
    const [users, setUsers] = useState([]);
    const [editUser, setEditUser] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', phoneNumber: '', parentPhoneNumber: '', center: '', password: '' });
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [gradeFilter, setGradeFilter] = useState('');
    const currentUserId = localStorage.getItem('userId');
    const currentUserType = localStorage.getItem('userType');
    const [searchType, setSearchType] = useState('all');
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [activateUser, setActivateUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedLessons, setSelectedLessons] = useState({});
    const [showLessonsFor, setShowLessonsFor] = useState(null);
    const [showCoursesModal, setShowCoursesModal] = useState(false);
    const [coursesModalUser, setCoursesModalUser] = useState(null);

    // إضافة state جديد لحفظ تفعيل الفيديو/الواجب لكل درس
    const [lessonActivations, setLessonActivations] = useState({});


    useEffect(() => {
        const initializeData = async () => {
        const userType = localStorage.getItem('userType');
            if (userType !== 'Admin' && userType !== 'Teacher') {
                navigate('/login');
                return;
            }

            // التحقق من صلاحية الـ token أولاً
            const isTokenValid = await checkTokenValidity();
            if (!isTokenValid) {
            navigate('/login');
                return;
            }

            const headers = getAuthHeaders();
            
            axios.get(`${API_BASE_URL}/api/users`, { headers })
            .then(res => setUsers(res.data))
            .catch(() => setUsers([]));
                
            axios.get(`${API_BASE_URL}/api/courses/all`, { headers })
            .then(res => setCourses(res.data))
            .catch(() => setCourses([]));
        };

        initializeData();
    }, [navigate]);

    const sortedUsers = [...users].sort((a, b) => {
        const order = { Teacher: 0, Admin: 1, Student: 2 };
        return (order[a.type] ?? 3) - (order[b.type] ?? 3);
    });

    const filteredUsers = sortedUsers.filter(user => {
        let matchesSearch = true;
        if (search) {
            if (searchType === 'all') {
                matchesSearch =
                    user.name.toLowerCase().includes(search.toLowerCase()) ||
                    user.phoneNumber.includes(search) ||
                    (user.center && user.center.toLowerCase().includes(search.toLowerCase()));
            } else if (searchType === 'name') {
                matchesSearch = user.name.toLowerCase().includes(search.toLowerCase());
            } else if (searchType === 'phone') {
                matchesSearch = user.phoneNumber.includes(search);
            } else if (searchType === 'center') {
                matchesSearch = user.center && user.center.toLowerCase().includes(search.toLowerCase());
            }
        }
        const matchesGrade = gradeFilter ? user.grade === gradeFilter : true;
        return matchesSearch && matchesGrade;
    });

    const handleToggleActive = async (user) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/users/${user._id}`, { active: !user.active });
            setUsers(users => users.map(u => u._id === user._id ? { ...u, active: res.data.active } : u));
        } catch (err) {
            alert('حدث خطأ أثناء تحديث حالة المستخدم');
        }
    };

    const handleDeleteUser = async (userId) => {
        const token = localStorage.getItem('token');
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users => users.filter(u => u._id !== userId));
        } catch (err) {
            alert('حدث خطأ أثناء حذف المستخدم');
        }
    };

    const handleChangeType = async (userId, newType) => {
        try {
            const res = await axios.put(`${API_BASE_URL}/api/users/${userId}`, { type: newType });
            setUsers(users => users.map(u => u._id === userId ? { ...u, type: res.data.type } : u));
        } catch (err) {
            alert('حدث خطأ أثناء تحديث نوع المستخدم');
        }
    };

    const handleEditClick = (user) => {
        setEditUser(user);
        setEditForm({
            name: user.name || '',
            phoneNumber: user.phoneNumber || '',
            parentPhoneNumber: user.parentPhoneNumber || '',
            center: user.center || '',
            password: ''
        });
    };

    const handleEditFormChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const handleEditSave = async () => {
        const token = localStorage.getItem('token');
        try {
            const dataToSend = { ...editForm };
            if (!editForm.password) delete dataToSend.password;
            const res = await axios.put(`${API_BASE_URL}/api/users/${editUser._id}`, dataToSend, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users => users.map(u => u._id === editUser._id ? { ...u, ...res.data } : u));
            setEditUser(null);
        } catch (err) {
            alert('حدث خطأ أثناء تعديل المستخدم');
        }
    };

    // عند فتح التفعيل، جهز lessonActivations من بيانات المستخدم
    const handleActivateClick = (user) => {
        setActivateUser(user);
        setShowActivateModal(true);
        const userCourseIds = user.purchasedCourses || [];
        setSelectedCourses(userCourseIds);
        const userLessonActivations = {};
        if (Array.isArray(user.purchasedLessons)) {
            user.purchasedLessons.forEach(l => {
                if (l.lessonId) {
                    userLessonActivations[l.lessonId] = { video: !!l.video, assignment: !!l.assignment };
                }
            });
        }
        setLessonActivations(userLessonActivations);
        setSelectedLessons({});
        setShowLessonsFor(null);
    };

    const handleCourseCheckbox = (courseId) => {
        const course = courses.find(c => c._id === courseId);
        setSelectedCourses(prev => {
            const isChecked = prev.includes(courseId);
            if (isChecked) {
                // إلغاء تفعيل الكورس: أزل من selectedCourses وأزل تفعيل كل الدروس
                setLessonActivations(prevActs => {
                    if (!course || !course.lessons) return prevActs;
                    const newActs = { ...prevActs };
                    course.lessons.forEach(lesson => {
                        delete newActs[lesson._id];
                    });
                    return newActs;
                });
                return prev.filter(id => id !== courseId);
            } else {
                // تفعيل الكورس: أضف للكورسات وفعّل كل الدروس
                setLessonActivations(prevActs => {
                    if (!course || !course.lessons) return prevActs;
                    const newActs = { ...prevActs };
                    course.lessons.forEach(lesson => {
                        newActs[lesson._id] = { video: true, assignment: true };
                    });
                    return newActs;
                });
                return [...prev, courseId];
            }
        });
    };

    const handleShowLessons = (courseId) => {
        setShowLessonsFor(showLessonsFor === courseId ? null : courseId);
    };

    const handleLessonCheckbox = (courseId, lessonId) => {
        // إلغاء تفعيل الكورس بالكامل
        setSelectedCourses(prev => prev.filter(id => id !== courseId));
        
        // تفعيل الدرس الفردي
        setLessonActivations(prev => ({
            ...prev,
            [lessonId]: { video: true, assignment: true }
        }));
    };

    // دوال التحكم في تفعيل الفيديو/الواجب
    const handleLessonActivationCheckbox = (lessonId, type) => {
        setLessonActivations(prev => ({
            ...prev,
            [lessonId]: {
                ...prev[lessonId],
                [type]: !prev[lessonId]?.[type]
            }
        }));
    };

    // تفعيل/إلغاء تفعيل الدرس بالكامل (فيديو وواجب معًا)
    const handleLessonFullActivationCheckbox = (lessonId) => {
        setLessonActivations(prev => {
            const isFullyActive = prev[lessonId]?.video && prev[lessonId]?.assignment;
            return {
                ...prev,
                [lessonId]: {
                    video: !isFullyActive,
                    assignment: !isFullyActive
                }
            };
        });
    };

    // دالة للتعامل مع تفعيل الامتحانات (منفصل عن تفعيل الدروس)


    // عند تأكيد التفعيل، جهز lessonActivations وأرسلها للـ backend
    const handleConfirmActivate = async () => {
        if (!activateUser) return;
        let data = { active: true };
        
        // إرسال الكورسات المختارة
        data.courseIds = selectedCourses.map(c => typeof c === 'object' ? c._id : c);
        
        // تجهيز تفعيل الدروس الفردية
        const activationsArr = [];
        Object.entries(lessonActivations).forEach(([lessonId, act]) => {
            if (act.video || act.assignment) {
                activationsArr.push({
                    lessonId,
                    video: !!act.video,
                    assignment: !!act.assignment
                });
            }
        });
        
        // إرسال تفعيل الدروس إذا وجد
        if (activationsArr.length > 0) {
            data.lessonActivations = activationsArr;
        }

        try {
            const res = await axios.put(`${API_BASE_URL}/api/users/${activateUser._id}`, data);
            setUsers(users => users.map(u => u._id === activateUser._id ? { ...u, ...res.data } : u));
            setShowActivateModal(false);
            setActivateUser(null);
            
            // إعادة تحميل فوري لتحديث البيانات
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (err) {
            alert('حدث خطأ أثناء تفعيل المستخدم');
        }
    };

    const handleShowCourses = (user) => {
        setCoursesModalUser(user);
        setShowCoursesModal(true);
    };



    return <>
        <div className="h-screen flex flex-col justify-start items-center font-GraphicSchool bg-bluetheme-500 gap-5 w-screen">
            <h1 className="bg-white text-bluetheme-500 text-5xl rounded-b-2xl p-3 font-GraphicSchool text-center head1">بيانات الطلاب</h1>

            <section className={`bg-white text-black rounded-xl flex items-center`}>
                <input type="text" className="h-full outline-none p-2.5 rounded-r-xl" placeholder='بحث' value={search} onChange={e => setSearch(e.target.value)} />
            </section>

            <div className="flex justify-center items-center gap-5">
                <button className={`bg-white text-bluetheme-500 rounded-xl p-1.5 text-[0.65rem] md:text-[1.1rem] ${gradeFilter === 'أولى ثانوي' ? 'border-2 border-bluetheme-500' : ''}`} onClick={() => setGradeFilter('أولى ثانوي')}>الأول الثانوي</button>
                <button className={`bg-white text-bluetheme-500 rounded-xl p-1.5 text-[0.65rem] md:text-[1.1rem] ${gradeFilter === 'تانية ثانوي' ? 'border-2 border-bluetheme-500' : ''}`} onClick={() => setGradeFilter('تانية ثانوي')}>الثاني الثانوي</button>
                <button className={`bg-white text-bluetheme-500 rounded-xl p-1.5 text-[0.65rem] md:text-[1.1rem] ${gradeFilter === 'تالتة ثانوي' ? 'border-2 border-bluetheme-500' : ''}`} onClick={() => setGradeFilter('تالتة ثانوي')}>الثالث الثانوي</button>
                <button className={`bg-white text-gray-500 text-[0.65rem] md:text-[1.1rem] rounded-xl p-1.5 btns ${gradeFilter === '' ? 'border-2 border-bluetheme-500' : ''}`} onClick={() => setGradeFilter('')}>الكل</button>
            </div>

            <div className="w-full p-4 overflow-x-auto" style={{ marginBottom: '45px' }}>
                <table className={`w-full ${classes.data}`}>
                    <thead className="bg-black text-white border-b-2 border-gray-800">
                        <tr className="rounded-xl">
                            <th className="p-3 text-md md:text-xl tracking-wider text-center rounded-tr-2xl"></th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center">Authority</th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center">Active</th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center">الكورسات</th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center">باسوورد</th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center">هاتف ولي الأمر</th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center">رقم الهاتف</th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center">السنتر</th>
                            <th className="p-3 text-sm md:text-md tracking-wider text-center rounded-tl-2xl">الأسم</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan={9} className="text-center text-gray-400">لا يوجد مستخدمين</td></tr>
                        )}
                        {filteredUsers.map((user, idx) => {
                            let showActions = false;
                            let showAuthority = false;
                            if (currentUserType === 'Teacher') {
                                showActions = user.type !== 'Teacher';
                                showAuthority = user.type !== 'Teacher';
                            } else if (currentUserType === 'Admin') {
                                showActions = user.type === 'Student';
                                showAuthority = user.type === 'Student';
                            }
                            return (
                                <tr key={user._id || idx}>
                                    <td className="p-3 text-md md:text-xl text-center tracking-wider flex gap-1">
                                        {showActions && (
                                            <>
                                                <button className="bg-bluetheme-500 text-white p-2 rounded-md text-lg md:text-xl font-GraphicSchool" onClick={() => handleEditClick(user)}><MdEdit /></button>
                                                <button className="bg-red-500 text-white p-2 rounded-md text-lg md:text-xl font-GraphicSchool" onClick={() => handleDeleteUser(user._id)}><MdDelete /></button>
                                            </>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider">
                                        {showAuthority ? (
                                            <select name="type" className="bg-orange-400 border-[0px] text-center p-1 rounded-lg" value={user.type} onChange={e => handleChangeType(user._id, e.target.value)}>
                                                <option value="Student">Student</option>
                                                <option value="Admin">Admin</option>
                                                {user.type === "Teacher" && <option value="Teacher">Teacher</option>}
                                            </select>
                                        ) : (
                                            <span>{user.type}</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider">
                                        {user.type === 'Student' && (
                                            <button onClick={() => handleActivateClick(user)} className="bg-blue-500 text-white px-3 py-1 rounded">تفعيل / إدارة التفعيل</button>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider">
                                        {user.type === 'Student' && (
                                            <button onClick={() => handleShowCourses(user)} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">عرض الكورسات/الدروس</button>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider">*****</td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider">{user.parentPhoneNumber || '-'}</td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider">{user.phoneNumber}</td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider">{user.center || '-'}</td>
                                    <td className="p-3 text-sm md:text-md text-center tracking-wider" style={user.resetRequested ? { color: 'red', fontWeight: 'bold' } : {}}>{user.name}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
        {editUser && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 min-w-[300px] flex flex-col gap-4 shadow-lg border-2 border-gray-300">
                    <h2 className="text-2xl mb-2 font-GraphicSchool">تعديل بيانات المستخدم</h2>
                    <label>الاسم:
                        <input name="name" value={editForm.name} onChange={handleEditFormChange} className="border rounded p-1 w-full" />
                    </label>
                    <label>رقم الهاتف:
                        <input name="phoneNumber" value={editForm.phoneNumber} onChange={handleEditFormChange} className="border rounded p-1 w-full" />
                    </label>
                    <label>هاتف ولي الأمر:
                        <input name="parentPhoneNumber" value={editForm.parentPhoneNumber} onChange={handleEditFormChange} className="border rounded p-1 w-full" />
                    </label>
                    <label>السنتر:
                        <input name="center" value={editForm.center} onChange={handleEditFormChange} className="border rounded p-1 w-full" />
                    </label>
                    <label>الباسورد الجديد:
                        <input name="password" type="password" value={editForm.password} onChange={handleEditFormChange} className="border rounded p-1 w-full" autoComplete="new-password" />
                    </label>
                    <div className="flex gap-2 mt-2">
                        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleEditSave}>حفظ</button>
                        <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setEditUser(null)}>إلغاء</button>
                    </div>
                </div>
            </div>
        )}
        {showActivateModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 min-w-[400px] flex flex-col gap-4 shadow-lg border-2 border-gray-300 max-h-[80vh] overflow-y-auto">
                    <h2 className="text-2xl mb-2 font-GraphicSchool">تفعيل الطالب واختيار الكورسات أو الدروس</h2>
                    <div className="flex flex-col gap-2">
                        {courses.map(course => {
                            const courseChecked = selectedCourses.includes(course._id);
                            const lessonsChecked = selectedLessons[course._id] || [];
                            return (
                                <div key={course._id} className="border rounded p-2 flex flex-col bg-gray-50">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={courseChecked}
                                            onChange={() => handleCourseCheckbox(course._id)}
                                            id={`course-${course._id}`}
                                        />
                                        <label htmlFor={`course-${course._id}`} className="font-bold">{course.name}</label>
                                        <button
                                            className="ml-2 text-blue-600 underline text-sm"
                                            type="button"
                                            onClick={() => handleShowLessons(course._id)}
                                        >
                                            {showLessonsFor === course._id ? 'إخفاء الدروس' : 'تفعيل دروس منفردة'}
                                        </button>
                                    </div>
                                    {showLessonsFor === course._id && course.lessons && course.lessons.length > 0 && (
                                        <div className="pl-6 flex flex-col gap-1 mt-2">
                                            {course.lessons.map(lesson => (
                                                <div key={lesson._id} className="flex items-center gap-2">
                                                    {/* Checkbox رئيسي لتفعيل الدرس بالكامل */}
                                                    <input
                                                        type="checkbox"
                                                        checked={!!lessonActivations[lesson._id]?.video && !!lessonActivations[lesson._id]?.assignment}
                                                        indeterminate={(!lessonActivations[lesson._id]?.video && lessonActivations[lesson._id]?.assignment) || (lessonActivations[lesson._id]?.video && !lessonActivations[lesson._id]?.assignment)}
                                                        onChange={() => handleLessonFullActivationCheckbox(lesson._id)}
                                                    />
                                                    <span>{lesson.title}</span>
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!lessonActivations[lesson._id]?.video}
                                                            onChange={() => handleLessonActivationCheckbox(lesson._id, 'video')}
                                                        />
                                                        <span>فيديو الحصة</span>
                                                    </label>
                                                    <label className="flex items-center gap-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!lessonActivations[lesson._id]?.assignment}
                                                            onChange={() => handleLessonActivationCheckbox(lesson._id, 'assignment')}
                                                        />
                                                        <span>الواجب</span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleConfirmActivate}>تأكيد التفعيل</button>
                        <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowActivateModal(false)}>إلغاء</button>
                    </div>
                </div>
            </div>
        )}
        {showCoursesModal && coursesModalUser && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 min-w-[350px] flex flex-col gap-4 shadow-lg border-2 border-gray-300 max-h-[80vh] overflow-y-auto">
                    <h2 className="text-2xl mb-2 font-GraphicSchool">الكورسات والدروس المفعلة للطالب</h2>
                    {courses.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {courses.map(course => {
                                // تحقق إذا كان الكورس مفعّل للطالب
                                const courseActive = coursesModalUser.purchasedCourses && coursesModalUser.purchasedCourses.includes(course._id);
                                // الدروس المفعلة لهذا الطالب في هذا الكورس
                                const lessonsActive = (course.lessons || []).filter(lesson => {
                                    // إذا الكورس مفعّل، كل الدروس مفعلة
                                    if (courseActive) return true;
                                    // ابحث عن تفعيل الدرس في purchasedLessons
                                    const lAct = Array.isArray(coursesModalUser.purchasedLessons)
                                        ? coursesModalUser.purchasedLessons.find(l => l.lessonId && l.lessonId.toString() === lesson._id.toString())
                                        : null;
                                    return lAct && (lAct.video || lAct.assignment);
                                });
                                if (!courseActive && lessonsActive.length === 0) return null;
                                return (
                                    <div key={course._id} className="border rounded p-2 bg-gray-50 mb-2">
                                        <div className="font-bold text-blue-700">{course.name}</div>
                                        {lessonsActive.length > 0 && (
                                            <ul className="list-disc pl-6 mt-1">
                                                {lessonsActive.map(lesson => {
                                                    // ابحث عن تفعيل الدرس
                                                    const lAct = Array.isArray(coursesModalUser.purchasedLessons)
                                                        ? coursesModalUser.purchasedLessons.find(l => l.lessonId && l.lessonId.toString() === lesson._id.toString())
                                                        : null;
                                                    const showVideo = courseActive || (lAct && lAct.video);
                                                    const showAssignment = courseActive || (lAct && lAct.assignment);
                                                    const showExam = courseActive || (lAct && lAct.exam);
                                                    return (
                                                        <li key={lesson._id} className="flex items-center gap-2">
                                                            <span>{lesson.title}</span>
                                                            {showVideo && <span className="text-green-600 text-xs bg-green-100 rounded px-1">فيديو الحصة</span>}
                                                            {showAssignment && <span className="text-blue-600 text-xs bg-blue-100 rounded px-1">الواجب</span>}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-gray-500">لا يوجد كورسات مفعلة لهذا الطالب</div>
                    )}
                    <button className="bg-gray-400 text-white px-4 py-2 rounded mt-2" onClick={() => setShowCoursesModal(false)}>إغلاق</button>
                </div>
            </div>
        )}

        {/* Bottom Nav */}
        <div className="font-GraphicSchool mt-8">
            <Bottom_nav />
        </div>
    </>;
}
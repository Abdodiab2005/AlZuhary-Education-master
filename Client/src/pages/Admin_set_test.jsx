import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import Bottom_nav from '../components/Bottom_nav';
import { MdClose } from 'react-icons/md';
import { checkTokenValidity, getAuthHeaders } from '../utils/tokenHandler';

export default function Admin_set_test() {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [lessons, setLessons] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState('');
    const [examName, setExamName] = useState('');
    const [examType, setExamType] = useState('current'); // 'current' أو 'previous'
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [existingExams, setExistingExams] = useState({ current: null, previous: null });
    const [currentExamId, setCurrentExamId] = useState(null);


    useEffect(() => {
        // فحص صلاحية التوكن عند تحميل الصفحة
        const checkAuth = async () => {
            const isValid = await checkTokenValidity();
            if (!isValid) {
                alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                window.location.href = '/login';
                return;
            }
            
            // التحقق من أن المستخدم هو Admin أو Teacher
            const userType = localStorage.getItem('userType');
            if (userType !== 'Admin' && userType !== 'Teacher') {
                alert('غير مصرح لك بالوصول لهذه الصفحة');
                window.location.href = '/';
                return;
            }
            
            setIsLoading(false);
        };
        
        checkAuth();
    }, []);

    useEffect(() => {
        // جلب الكورسات عند تحميل الصفحة
        if (isLoading) return;
        
        axios.get(`${API_BASE_URL}/api/courses`, {
            headers: getAuthHeaders()
        })
            .then(res => setCourses(res.data))
            .catch(err => {
                if (err.response?.status === 401 || err.response?.status === 403) {
                    alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                    window.location.href = '/login';
                } else {
                    setCourses([]);
                }
            });
    }, [isLoading]);

    useEffect(() => {
        // عند تغيير الكورس المختار، جلب الدروس الخاصة به
        if (selectedCourse) {
            const course = courses.find(c => c._id === selectedCourse);
            setLessons(course ? course.lessons : []);
            setSelectedLesson('');
            // لا نعيد تعيين examType هنا لتجنب التحديث المستمر
        } else {
            setLessons([]);
            setSelectedLesson('');
        }
    }, [selectedCourse, courses]);

    useEffect(() => {
        // عند تغيير الكورس أو الدرس، جلب الامتحانات الموجودة
        if (selectedCourse && selectedLesson && !isLoading) {
            axios.get(`${API_BASE_URL}/api/exams/lesson/${selectedLesson}`, {
                headers: getAuthHeaders()
            })
                .then(res => {
                    if (res.data.organized) {
                        setExistingExams({
                            current: res.data.organized.current,
                            previous: res.data.organized.previous
                        });
                        
                        // إذا كان هناك امتحان من النوع المختار، عبئ البيانات
                        const selectedExam = res.data.organized[examType];
                        if (selectedExam) {
                            setExamName(selectedExam.name || '');
                            setCurrentExamId(selectedExam._id);
                            setQuestions((selectedExam.questions || []).map(q => ({
                                text: q.text,
                                image: q.image,
                                answers: (q.answers || []).map(a => a.text),
                                correctAnswerIndex: q.correctAnswerIndex
                            })));
                        } else {
                            setExamName('');
                            setCurrentExamId(null);
                            setQuestions([]);
                        }
                    } else {
                        setExistingExams({ current: null, previous: null });
                        setExamName('');
                        setCurrentExamId(null);
                        setQuestions([]);
                    }
                })
                .catch(err => {
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                        window.location.href = '/login';
                    } else {
                        setExistingExams({ current: null, previous: null });
                        setExamName('');
                        setCurrentExamId(null);
                        setQuestions([]);
                    }
                });
                } else {
            setExistingExams({ current: null, previous: null });
            setQuestions([]);
            setExamName('');
            setCurrentExamId(null);
        }
    }, [selectedCourse, selectedLesson, examType]);
    
    // عند تغيير نوع الامتحان، عبئ البيانات المناسبة
    useEffect(() => {
        if (existingExams[examType]) {
            const selectedExam = existingExams[examType];
            setExamName(selectedExam.name || '');
            setCurrentExamId(selectedExam._id);
            setQuestions((selectedExam.questions || []).map(q => ({
                text: q.text,
                image: q.image,
                answers: (q.answers || []).map(a => a.text),
                correctAnswerIndex: q.correctAnswerIndex
            })));
        } else {
            setExamName('');
            setCurrentExamId(null);
            setQuestions([]);
        }
    }, [examType, existingExams]);
    
    // دالة إعادة تحميل بيانات الامتحان
    function reloadExamData() {
        if (selectedLesson) {
            axios.get(`${API_BASE_URL}/api/exams/lesson/${selectedLesson}`, {
                headers: getAuthHeaders()
            })
            .then(res => {
                console.log('Reload exam response:', res.data);
                if (res.data.all && res.data.all.length > 0) {
                    // البحث عن الامتحان بنفس النوع
                    const exam = res.data.all.find(exam => exam.examType === examType);
                    console.log('Found exam with matching type:', exam);
                    if (exam) {
                        setExamName(exam.name || '');
                        setExamType(exam.examType || '');
                        setQuestions((exam.questions || []).map(q => ({
                            text: q.text,
                            image: q.image,
                            answers: (q.answers || []).map(a => a.text),
                            correctAnswerIndex: q.correctAnswerIndex
                        })));
                    }
                }
            })
            .catch(err => {
                console.error('Error reloading exam data:', err);
            });
        }
    }

    function handleSaveExam() {
        if (!selectedCourse || !selectedLesson || !examName) {
            alert('يرجى اختيار الكورس والدرس وكتابة اسم الامتحان');
            return;
        }
        // تحقق من وجود أسئلة وإجابات
        if (questions.length === 0) {
            alert('يجب إضافة سؤال واحد على الأقل');
            return;
        }
        for (const q of questions) {
            if (!q.text || q.answers.some(a => !a)) {
                alert('يرجى ملء جميع الأسئلة والإجابات');
                return;
            }
        }
        
        // التحقق من نوع الامتحان
        if (!examType || !['current', 'previous'].includes(examType)) {
            alert('يرجى اختيار نوع الامتحان (حالي أو سابق)');
            return;
        }
        
        // التحقق من وجود امتحان بنفس النوع
        if (existingExams[examType]) {
            alert(`يوجد امتحان ${examType === 'current' ? 'حالي' : 'سابق'} لهذا الدرس بالفعل. استخدم زر التحديث لتعديله.`);
            return;
        }
        
        // تجهيز البيانات
        const data = {
            name: examName,
            courseId: selectedCourse,
            lessonId: selectedLesson,
            examType: examType,
            questions: questions.map(q => ({
                text: q.text,
                image: q.image,
                answers: q.answers.map(a => ({ text: a })),
                correctAnswerIndex: q.correctAnswerIndex
            }))
        };
        
        // إنشاء امتحان جديد
        axios.post(`${API_BASE_URL}/api/exams`, data, {
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            }
        })
        .then(res => {
            alert('تم إنشاء امتحان جديد بنجاح!');
            // تحديث البيانات
            const examData = res.data.exam || res.data;
            setCurrentExamId(examData._id);
            setExistingExams(prev => ({
                ...prev,
                [examType]: examData
            }));
        })
        .catch(err => {
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                window.location.href = '/login';
            } else if (err.response?.status === 400) {
                // إذا كان هناك امتحان موجود، عبئ البيانات
                const existingExam = err.response.data.existingExam;
                if (existingExam) {
                    setExamName(existingExam.name || '');
                    setCurrentExamId(existingExam._id);
                    setQuestions((existingExam.questions || []).map(q => ({
                        text: q.text,
                        image: q.image,
                        answers: (q.answers || []).map(a => a.text),
                        correctAnswerIndex: q.correctAnswerIndex
                    })));
                    setExistingExams(prev => ({
                        ...prev,
                        [examType]: existingExam
                    }));
                }
                alert(err.response.data.message);
            } else {
                alert('حدث خطأ أثناء حفظ الامتحان: ' + (err.response?.data?.message || err.message));
            }
        });
    }

    // دالة تحديث الامتحان
    function handleUpdateExam() {
        if (!currentExamId) {
            alert('لا يوجد امتحان للتحديث');
            return;
        }
        
        if (!examName || questions.length === 0) {
            alert('يرجى ملء جميع البيانات المطلوبة');
            return;
        }
        
        // تجهيز البيانات
        const data = {
            name: examName,
            courseId: selectedCourse,
            lessonId: selectedLesson,
            examType: examType,
            questions: questions.map(q => ({
                text: q.text,
                image: q.image,
                answers: q.answers.map(a => ({ text: a })),
                correctAnswerIndex: q.correctAnswerIndex
            }))
        };
        
        // تحديث الامتحان
        axios.put(`${API_BASE_URL}/api/exams/${currentExamId}`, data, {
            headers: { 
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            }
        })
        .then(res => {
            alert('تم تحديث الامتحان بنجاح!');
            // تحديث البيانات
            setExistingExams(prev => ({
                ...prev,
                [examType]: res.data.exam
            }));
        })
        .catch(err => {
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                window.location.href = '/login';
            } else {
                alert('حدث خطأ أثناء تحديث الامتحان: ' + (err.response?.data?.message || err.message));
            }
        });
    }
    
    // دالة حذف الامتحان
    function handleDeleteExam() {
        if (!currentExamId) {
            alert('لا يوجد امتحان للحذف');
            return;
        }
        
        if (!confirm(`هل أنت متأكد من حذف الامتحان "${examName}"؟`)) {
            return;
        }
        
        axios.delete(`${API_BASE_URL}/api/exams/${currentExamId}`, {
            headers: getAuthHeaders()
        })
        .then(res => {
            alert('تم حذف الامتحان بنجاح!');
            // إعادة تعيين البيانات
            setExamName('');
            setQuestions([]);
            setCurrentExamId(null);
            setExistingExams(prev => ({
                ...prev,
                [examType]: null
            }));
        })
        .catch(err => {
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                window.location.href = '/login';
            } else {
                alert('حدث خطأ أثناء حذف الامتحان: ' + (err.response?.data?.message || err.message));
            }
        });
    }

    // أضف دالة إضافة سؤال:
    function handleAddQuestion() {
        setQuestions([...questions, {
            text: '',
            image: '',
            answers: ['', '', '', ''],
            correctAnswerIndex: 0
        }]);
    }

    if (isLoading) {
        return (
            <div className="h-screen w-full max-w-[650px] mr-auto ml-auto font-GraphicSchool flex flex-col justify-center items-center">
                <div className="text-2xl text-bluetheme-500">جاري التحميل...</div>
            </div>
        );
    }

    return <>
        <div className="h-screen w-full max-w-[650px] mr-auto ml-auto font-GraphicSchool flex flex-col justify-start items-center p-1 pb-32">
            <div className="flex flex-col md:flex-row gap-2 w-full items-center justify-center mb-6">
                <select
                    className="mb-15 bg-bluetheme-500 text-white text-xl rounded-xl p-2 w-[180px] md:w-[200px] text-center"
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                >
                    <option value="">اختر الكورس</option>
                    {courses.map(course => (
                        <option key={course._id} value={course._id}>{course.name}</option>
                    ))}
                </select>
                <select
                    className="mb-15 bg-bluetheme-500 text-white text-xl rounded-xl p-2 w-[180px] md:w-[200px] text-center"
                    value={selectedLesson}
                    onChange={e => setSelectedLesson(e.target.value)}
                    disabled={!selectedCourse}
                >
                    <option value="">اختر الدرس</option>
                    {lessons.map(lesson => (
                        <option key={lesson._id} value={lesson._id}>{lesson.title}</option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="اسم الامتحان"
                    className="mb-15 bg-bluetheme-500 text-white text-2xl md:text-4xl text-center rounded-xl p-2 w-[200px] md:w-[350px]"
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                />
                
                                 {/* اختيار نوع الامتحان - أزرار تحديد */}
                 <div className="flex gap-2 items-center">
                     <label className="text-bluetheme-500 text-xl font-bold">نوع الامتحان:</label>
                     <div className="flex gap-2">
                         <button
                             type="button"
                             className={`px-4 py-2 rounded-lg text-lg font-bold transition-colors ${
                                 examType === 'current' 
                                     ? 'bg-green-600 text-white' 
                                     : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                             }`}
                             onClick={() => setExamType('current')}
                         >
                             امتحان حالي {existingExams.current && <span className="text-xs">(موجود)</span>}
                         </button>
                         <button
                             type="button"
                             className={`px-4 py-2 rounded-lg text-lg font-bold transition-colors ${
                                 examType === 'previous' 
                                     ? 'bg-green-600 text-white' 
                                     : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                             }`}
                             onClick={() => setExamType('previous')}
                         >
                             امتحان سابق {existingExams.previous && <span className="text-xs">(موجود)</span>}
                         </button>
                     </div>
                 </div>
            </div>

            <div className="flex flex-col gap-7 w-full">
                {/* Single Question */}
                {questions.map((q, idx) => (
                    <section key={idx} className="flex flex-col items-center w-full gap-3 relative">
                        <button className="absolute -top-4 -right-4 bg-bluetheme-500 text-red-600 text-3xl rounded-full p-1 shadow" onClick={() => {
                            const newQuestions = [...questions];
                            newQuestions.splice(idx, 1);
                            setQuestions(newQuestions);
                        }}><MdClose /></button>
                        <div className="flex w-[100%] gap-1">
                            <div className="w-[70%] p-1.5 rounded-lg bg-bluetheme-500 text-2xl text-white text-center">
                                <input
                                    type="text"
                                    className="w-full rounded-lg p-1 bg-bluetheme-500 text-white text-center border-none outline-none"
                                    placeholder="ادخل السؤال"
                                    value={q.text}
                                    onChange={e => {
                                        const newQuestions = [...questions];
                                        newQuestions[idx].text = e.target.value;
                                        setQuestions(newQuestions);
                                    }}
                                />
                            </div>
                            <div className="w-[30%] rounded-lg p-1.5 bg-bluetheme-500 text-center text-white">
                                <label htmlFor={`upload-img-${idx}`}>اضافة صورة</label>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    id={`upload-img-${idx}`}
                                    onChange={async e => {
                                        if (e.target.files && e.target.files[0]) {
                                            const formData = new FormData();
                                            formData.append('file', e.target.files[0]);
                                            try {
                                                const res = await axios.post(`${API_BASE_URL}/api/files/upload`, formData, { 
                                                    headers: { 
                                                        'Content-Type': 'multipart/form-data',
                                                        ...getAuthHeaders()
                                                    } 
                                                });
                                                const newQuestions = [...questions];
                                                newQuestions[idx].image = res.data.url;
                                                setQuestions(newQuestions);
                                            } catch (err) {
                                                if (err.response?.status === 401 || err.response?.status === 403) {
                                                    alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
                                                    window.location.href = '/login';
                                                } else {
                                                    alert('حدث خطأ أثناء رفع الصورة');
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        {q.image && (
                                                            <img src={`${API_BASE_URL}${q.image}`} alt="صورة السؤال" className="w-60 h-60 object-contain rounded mb-2" />
                        )}

                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <div className="flex justify-center items-center">
                                    <input
                                        type="radio"
                                        name={`correct-answer-${idx}`}
                                        checked={q.correctAnswerIndex === 0}
                                        onChange={() => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].correctAnswerIndex = 0;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="اضافة اجابة"
                                        className="w-[50%] rounded-lg p-1 bg-bluetheme-500 text-white text-center"
                                        value={q.answers[0] || ''}
                                        onChange={e => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].answers[0] = e.target.value;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                </div>
                                <div className="flex justify-center items-center">
                                    <input
                                        type="radio"
                                        name={`correct-answer-${idx}`}
                                        checked={q.correctAnswerIndex === 1}
                                        onChange={() => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].correctAnswerIndex = 1;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="اضافة اجابة"
                                        className="w-[50%] rounded-lg p-1 bg-bluetheme-500 text-white text-center"
                                        value={q.answers[1] || ''}
                                        onChange={e => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].answers[1] = e.target.value;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex justify-center items-center">
                                    <input
                                        type="radio"
                                        name={`correct-answer-${idx}`}
                                        checked={q.correctAnswerIndex === 2}
                                        onChange={() => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].correctAnswerIndex = 2;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="اضافة اجابة"
                                        className="w-[50%] rounded-lg p-1 bg-bluetheme-500 text-white text-center"
                                        value={q.answers[2] || ''}
                                        onChange={e => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].answers[2] = e.target.value;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                </div>
                                <div className="flex justify-center items-center">
                                    <input
                                        type="radio"
                                        name={`correct-answer-${idx}`}
                                        checked={q.correctAnswerIndex === 3}
                                        onChange={() => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].correctAnswerIndex = 3;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="اضافة اجابة"
                                        className="w-[50%] rounded-lg p-1 bg-bluetheme-500 text-white text-center"
                                        value={q.answers[3] || ''}
                                        onChange={e => {
                                            const newQuestions = [...questions];
                                            newQuestions[idx].answers[3] = e.target.value;
                                            setQuestions(newQuestions);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                ))}
            </div>

            <div className="flex flex-row gap-3 w-full justify-center mt-10 mb-32">
                <button className="bg-green-500 text-2xl p-2 rounded-lg hover:bg-green-600 cursor-pointer" onClick={handleAddQuestion} disabled={!selectedCourse || !selectedLesson}>اضافة سؤال</button>
                
                {/* أزرار الامتحان */}
                {currentExamId ? (
                    <>
                        <button className="bg-yellow-500 text-2xl p-2 rounded-lg hover:bg-yellow-600 cursor-pointer" onClick={handleUpdateExam} disabled={!selectedCourse || !selectedLesson}>تحديث الامتحان</button>
                        <button className="bg-red-500 text-2xl p-2 rounded-lg hover:bg-red-600 cursor-pointer" onClick={handleDeleteExam} disabled={!selectedCourse || !selectedLesson}>حذف الامتحان</button>
                    </>
                ) : (
                    <button className="bg-blue-500 text-2xl p-2 rounded-lg hover:bg-blue-600 cursor-pointer" onClick={handleSaveExam} disabled={!selectedCourse || !selectedLesson}>حفظ الامتحان</button>
                )}
            </div>
        </div>
    </>
}
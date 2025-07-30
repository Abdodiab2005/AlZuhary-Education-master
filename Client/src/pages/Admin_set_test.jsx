import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import Bottom_nav from '../components/Bottom_nav';
import { MdClose } from 'react-icons/md';

export default function Admin_set_test() {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [lessons, setLessons] = useState([]);
    const [selectedLesson, setSelectedLesson] = useState('');
    const [examName, setExamName] = useState('');
    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        // جلب الكورسات عند تحميل الصفحة
        axios.get(`${API_BASE_URL}/api/courses`)
            .then(res => setCourses(res.data))
            .catch(() => setCourses([]));
    }, []);

    useEffect(() => {
        // عند تغيير الكورس المختار، جلب الدروس الخاصة به
        if (selectedCourse) {
            const course = courses.find(c => c._id === selectedCourse);
            setLessons(course ? course.lessons : []);
            setSelectedLesson('');
        } else {
            setLessons([]);
            setSelectedLesson('');
        }
    }, [selectedCourse, courses]);

    useEffect(() => {
        // عند تغيير الكورس أو الدرس، جلب الامتحان الحالي (إن وجد)
        if (selectedCourse && selectedLesson) {
            axios.get(`${API_BASE_URL}/api/exams/lesson/${selectedLesson}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => {
                    if (Array.isArray(res.data) && res.data.length > 0) {
                        // إذا كان هناك امتحان، عبئ الأسئلة
                        const exam = res.data[0];
                        setExamName(exam.name || '');
                        setQuestions((exam.questions || []).map(q => ({
                            text: q.text,
                            image: q.image,
                            answers: (q.answers || []).map(a => a.text),
                            correctAnswerIndex: q.correctAnswerIndex
                        })));
                    } else {
                        setExamName('');
                        setQuestions([]);
                    }
                })
                .catch(() => {
                    setExamName('');
                    setQuestions([]);
                });
        } else {
            setQuestions([]);
            setExamName('');
        }
    }, [selectedCourse, selectedLesson]);

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
        // تجهيز البيانات
        const data = {
            name: examName,
            courseId: selectedCourse,
            lessonId: selectedLesson,
            questions: questions.map(q => ({
                text: q.text,
                image: q.image,
                answers: q.answers.map(a => ({ text: a })),
                correctAnswerIndex: q.correctAnswerIndex
            }))
        };
                    axios.post(`${API_BASE_URL}/api/exams`, data)
            .then(res => {
                alert('تم حفظ الامتحان بنجاح!');
                // يمكنك إعادة تعيين الفورم هنا إذا أردت
            })
            .catch(err => {
                alert('حدث خطأ أثناء حفظ الامتحان');
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
                                            const res = await axios.post(`${API_BASE_URL}/api/files/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                            const newQuestions = [...questions];
                                            newQuestions[idx].image = res.data.url;
                                            setQuestions(newQuestions);
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
                <button className="bg-blue-500 text-2xl p-2 rounded-lg hover:bg-blue-600 cursor-pointer" onClick={handleSaveExam} disabled={!selectedCourse || !selectedLesson}>حفظ الامتحان</button>
            </div>
        </div>
    </>
}
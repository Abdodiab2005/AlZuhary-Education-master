import question from '../imgs/question.jpg'
import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import Header from '../components/Header';
import Bottom_nav from '../components/Bottom_nav';

export default function Student_test() {
    const { lessonId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        // إذا كان الامتحان موجود في location state
        if (location.state?.exam) {
            setExam(location.state.exam);
            setLoading(false);
        } else if (lessonId) {
            // جلب الامتحان من الباك إند
            fetchExam();
        } else {
            setLoading(false);
        }
    }, [lessonId, location.state, navigate]);

    const fetchExam = async () => {
        try {
            const token = localStorage.getItem('token');
            
            const response = await axios.get(`${API_BASE_URL}/api/exams/lesson/${lessonId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // البحث عن امتحان current (حالي) أولاً
            if (response.data && response.data.organized && response.data.organized.current) {
                setExam(response.data.organized.current);
            } else if (response.data && response.data.all && response.data.all.length > 0) {
                // إذا لم يكن هناك امتحان current، خذ أول امتحان
                setExam(response.data.all[0]);
            } else {
                alert('لا يوجد امتحان لهذا الدرس');
                navigate(-1);
            }
        } catch (error) {
            alert('حدث خطأ في جلب الامتحان');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionIndex, answerIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: answerIndex
        }));
    };

    const handleSubmitExam = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_BASE_URL}/api/exams/${exam._id}/submit`, {
                answers: answers
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setScore(response.data);
            setIsSubmitted(true);
            
            // تحديث البيانات في localStorage بعد نجاح الامتحان
            if (response.data.passed) {
                // جلب البيانات المحدثة من السيرفر
                const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // تحديث البيانات في localStorage
                localStorage.setItem('userData', JSON.stringify(userResponse.data));
            }
        } catch (error) {
            alert('حدث خطأ في إرسال الامتحان');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-xl">جاري التحميل...</div>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-xl">لا يوجد امتحان</div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="font-GraphicSchool min-h-screen bg-gray-50">
                <Header />
                
                <div className="pt-20 pb-20 px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-lg shadow-md p-6 text-center">
                            <h2 className="text-2xl font-bold mb-4">نتيجة الامتحان</h2>
                            
                            <div className="mb-6">
                                <div className="text-4xl font-bold mb-2">
                                    {score.score}/{score.total}
                                </div>
                                <div className="text-lg text-gray-600 mb-4">
                                    النسبة المئوية: {Math.round((score.score / score.total) * 100)}%
                                </div>
                                <div className={`text-lg font-semibold ${
                                    score.passed ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {score.passed ? 'ممتاز! لقد نجحت في الامتحان' : 'للأسف لم تنجح في الامتحان'}
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    // تحديث البيانات قبل العودة
                                    if (score.passed) {
                                        const token = localStorage.getItem('token');
                                        try {
                                            const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            localStorage.setItem('userData', JSON.stringify(userResponse.data));
                                        } catch (error) {
                                        }
                                    }
                                    // العودة للكورس
                                    navigate(-1, { replace: true });
                                }}
                                className="bg-bluetheme-500 text-white px-6 py-2 rounded-lg hover:bg-bluetheme-600"
                            >
                                العودة للكورس
                            </button>
                        </div>
                    </div>
                </div>

                <Bottom_nav />
            </div>
        );
    }

    return (
        <div className="font-GraphicSchool min-h-screen bg-gray-50">
            <Header />
            
            <div className="pt-20 pb-20 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* عنوان الامتحان */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h1 className="text-center text-2xl bg-bluetheme-500 p-1.5 rounded-lg text-white w-full max-w-[300px] mr-auto ml-auto mb-4">
                            {exam.name}
                        </h1>
                        <div className="text-center text-gray-600">
                            عدد الأسئلة: {exam.questions.length}
                        </div>
                    </div>

                    {/* عرض الأسئلة */}
                    <div className="flex flex-col w-full gap-20">
                        {exam.questions.map((question, questionIndex) => (
                            <section key={questionIndex} className='w-full'>
                                {/* نص السؤال */}
                                <div className='w-[100%] mb-4'>
                                    <h3 className='text-xl font-bold text-center bg-bluetheme-500 text-white p-3 rounded-lg'>
                                        {question.text || `السؤال ${questionIndex + 1}`}
                                    </h3>
                                </div>
                                
                                {/* صورة السؤال (إن وجدت) */}
                                {question.image && (
                                    <div className='w-[100%] mb-4'>
                                        <img 
                                            src={`${API_BASE_URL}${question.image}`}
                                            alt="" 
                                            className='object-contain max-h-[250px] mr-auto ml-auto' 
                                        />
                                    </div>
                                )}

                                <div className='flex flex-col w-full p-2 gap-3'>
                                    <div className='flex gap-2 items-center w-full'>
                                        <div className='w-[100%] text-start flex'>
                                            <input 
                                                type="radio" 
                                                name={`question-${questionIndex}`}
                                                checked={answers[questionIndex] === 0}
                                                onChange={() => handleAnswerSelect(questionIndex, 0)}
                                            />
                                            <label className='bg-bluetheme-500 w-[100%] text-white p-1 text-center rounded-lg'>
                                                {question.answers[0]?.text || 'إجابة'}
                                            </label>
                                        </div>
                                        <div className='w-[100%] text-start flex'>
                                            <input 
                                                type="radio" 
                                                name={`question-${questionIndex}`}
                                                checked={answers[questionIndex] === 1}
                                                onChange={() => handleAnswerSelect(questionIndex, 1)}
                                            />
                                            <label className='bg-bluetheme-500 w-[100%] text-white p-1 text-center rounded-lg'>
                                                {question.answers[1]?.text || 'إجابة'}
                                            </label>
                                        </div>
                                    </div>

                                    <div className='flex gap-2 items-center w-full'>
                                        <div className='w-[100%] text-start flex'>
                                            <input 
                                                type="radio" 
                                                name={`question-${questionIndex}`}
                                                checked={answers[questionIndex] === 2}
                                                onChange={() => handleAnswerSelect(questionIndex, 2)}
                                            />
                                            <label className='bg-bluetheme-500 w-[100%] text-white p-1 text-center rounded-lg'>
                                                {question.answers[2]?.text || 'إجابة'}
                                            </label>
                                        </div>
                                        <div className='w-[100%] text-start flex'>
                                            <input 
                                                type="radio" 
                                                name={`question-${questionIndex}`}
                                                checked={answers[questionIndex] === 3}
                                                onChange={() => handleAnswerSelect(questionIndex, 3)}
                                            />
                                            <label className='bg-bluetheme-500 w-[100%] text-white p-1 text-center rounded-lg'>
                                                {question.answers[3]?.text || 'إجابة'}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>

                    <button 
                        className='bg-green-400 p-2.5 text-3xl rounded-lg hover:bg-green-600 cursor-pointer mt-10'
                        onClick={handleSubmitExam}
                    >
                        تسليم
                    </button>
                </div>
            </div>

            <Bottom_nav />
        </div>
    );
}
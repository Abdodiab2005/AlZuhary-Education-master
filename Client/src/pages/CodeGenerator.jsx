import { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import { useNavigate } from 'react-router-dom';
import Bottom_nav from '../components/Bottom_nav';
import classes from '../css/code.module.css'

function generateCode(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export default function CodeGenerator() {
    const navigate = useNavigate();
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userType = localStorage.getItem('userType');
        if (!token || (userType !== 'Admin' && userType !== 'Teacher')) {
            navigate('/login');
        }
    }, [navigate]);

    const [count, setCount] = useState(5);
    const [value, setValue] = useState(50);
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showPrint, setShowPrint] = useState(false);

    const handleGenerate = async () => {
        setMessage('');
        setLoading(true);
        const newCodes = [];
        for (let i = 0; i < count; i++) {
            newCodes.push({ code: generateCode(10), value });
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/recharge/generate`, { codes: newCodes }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCodes(newCodes);
            setMessage('تم حفظ الأكواد بنجاح!');
        } catch (err) {
            setCodes([]);
            if (err.response && err.response.data && err.response.data.message) {
                setMessage('خطأ: ' + err.response.data.message);
            } else {
                setMessage('حدث خطأ أثناء حفظ الأكواد');
            }
        }
        setLoading(false);
    };

    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        alert('تم نسخ الكود!');
    };

    const handlePrint = () => {
        setShowPrint(true);
        setTimeout(() => {
            window.print();
            setShowPrint(false);
        }, 100);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-start bg-white py-8 px-2 gap-6 font-GraphicSchool">
            <div className="bg-transparent rounded-xl shadow-none p-0 w-full max-w-3xl flex flex-col items-center gap-6">
                <h1 className="text-3xl font-bold text-bluetheme-500 mb-2 text-center">CODE GENERATOR</h1>
                {/* قسم الإدخال */}
                <section className="flex items-end gap-6 bg-bluetheme-500 rounded-2xl p-2.5 w-fit md:mr-auto md:ml-auto">
                    <div className="flex flex-col items-center gap-1.5">
                        <label className="text-white">سعر الكود</label>
                        <input type="number" min="1" value={value} onChange={e => setValue(Number(e.target.value))} className="w-[80px] h-[40px] text-center bg-white rounded-lg p-0.5 md:w-[100px]" placeholder="00.0 ج.م" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <label className="text-white">عدد الأكواد</label>
                        <input type="number" min="1" value={count} onChange={e => setCount(Number(e.target.value))} className="w-[80px] h-[40px] text-center bg-white rounded-lg p-0.5 md:w-[100px]" placeholder="00" />
                    </div>
                    <button onClick={handleGenerate} className="text-white bg-red-500 rounded-[50%] text-[9px] w-[48px] h-[48px] flex items-center justify-center" disabled={loading}>{loading ? '...' : 'GENERATE'}</button>
                </section>
                {/* نهاية قسم الإدخال */}
                {message && <div className={`mt-2 ${message.startsWith('تم') ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
                {codes.length > 0 && (
                    <section className="flex w-full flex-col justify-center items-center mt-5 p-2">
                        <header className="w-[100%] flex justify-between items-center rounded-t-2xl">
                            <span className="bg-blue-500 w-full text-center p-2 head2 rounded-tr-2xl font-GraphicSchool">الكود</span>
                            <span className="bg-blue-500 w-full text-center p-2 head2 font-GraphicSchool">السعر</span>
                            <span className="bg-blue-500 w-full text-center p-2 head2 rounded-tl-2xl font-GraphicSchool">نسخ</span>
                        </header>
                        <div className={`flex flex-col items-center w-full ${classes.code} text-[22px] font-GraphicSchool`}>
                            {codes.map((item, idx) => (
                                <div key={idx} className="w-[100%] flex justify-between items-center">
                                    <span className="bg-gray-400 border-b-2 border-white w-full text-center p-2 font-GraphicSchool">{item.code || item}</span>
                                    <span className="bg-gray-400 border-b-2 border-white w-full text-center p-2 font-GraphicSchool">{item.value || value}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(item.code || item)}
                                        className='w-full text-center bg-red-500 hover:bg-red-600 cursor-pointer text-white p-2 border-b-2 font-GraphicSchool'
                                    >
                                        نسخ
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handlePrint} className="bg-green-500 hover:bg-green-700 text-white head2 p-2 rounded-xl mt-3 font-GraphicSchool">طباعة الأكواد</button>
                    </section>
                )}
            </div>
            {showPrint && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'white', zIndex: 9999, padding: 0 }}>
                    <style>{`
                        @media print {
                            body { margin: 0 !important; }
                            .print-area { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 100vw; min-height: 100vh; background: white; }
                            .print-code-item { font-family: monospace; font-size: 32px; font-weight: bold; margin-bottom: 32px; border-bottom: 2px dashed #888; padding: 16px 0; width: 80vw; text-align: center; }
                            .print-code-value { font-size: 22px; margin-right: 40px; font-weight: normal; }
                            h2 { font-size: 36px; margin: 32px 0 40px 0; text-align: center; }
                        }
                    `}</style>
                    <div className="print-area">
                        <h2>كروت الشحن</h2>
                        {codes.map((item, idx) => (
                            <div key={idx} className="print-code-item">
                                <span>{item.code}</span>
                                <span className="print-code-value">قيمة: {item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <Bottom_nav />
        </div>
    );
} 
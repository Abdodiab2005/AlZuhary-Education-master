import { IoClose, IoSend } from "react-icons/io5";
import { Link } from "react-router-dom";
import { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';

export default function Reset_pass() {
    const [phone, setPhone] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const handleSubmit = async () => {
        setError('');
        setResult(null);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/request-password-reset`, { phoneNumber: phone });
            setResult(res.data.name);
        } catch (err) {
            setError(err.response?.data?.message || 'حدث خطأ');
        }
    };
    return <>
        {/* Container */}
        <div className="flex justify-center items-center w-full h-[100vh] bg-bluetheme-500 font-GraphicSchool">

            {/* Reset Form */}
            <div className="bg-white flex flex-col justify-center items-center p-5 gap-4 relative rounded-4xl">
                <Link to={'/login'}>
                    <button className="absolute top-3 right-3">
                        <IoClose className="bg-gray-300 rounded-4xl font-extrabold hover:scale-[1.08] duration-[0.2s] hover:bg-gray-400 hover:text-black text-lg md:text-xl lg:text-2xl" />
                    </button>
                </Link>


                <h2 className="head2">نسيت الباسورد</h2>
                <span className="spans text-bluetheme-500 text-center">ادخل رقم الهاتف و سيقوم احد من الدعم الفني بالتواصل معك</span>

                {/* Data Input */}
                <section className="flex flex-col justify-center items-end w-[60%] gap-3">
                    <label className="labels text-end">رقم الهاتف</label>
                    <input type="tel" placeholder="xxxxxxxxxxx" className="border-none p-2 bg-bluetheme-500 text-center rounded-lg text-white w-[100%]" value={phone} onChange={e => setPhone(e.target.value)} />
                </section>

                {/* Submit btn */}
                <button className="flex justify-center items-center rounded-lg gap-3 bg-bluetheme-500 p-2 w-[40%] text-white hover:bg-blue-700 hover:scale-[1.08] duration-[0.2s]" onClick={handleSubmit}>
                    <IoSend />
                    <span>ارسال</span>
                </button>
                {result && <div className="mt-2 text-green-600 font-bold">تم ارسال طلبك</div>}
                {error && (error === 'تم ارسال طلبك من قبل برجاء انتظار معالجة طلبك'
                  ? <div className="mt-2 text-green-600 font-bold">{error}</div>
                  : <div className="mt-2 text-red-600">{error}</div>
                )}
            </div>
        </div>
    </>
}

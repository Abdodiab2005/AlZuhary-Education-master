import login_img_mop from "../imgs/login_img_mop.png"
import { FaFacebook, FaWhatsapp, FaYoutube } from "react-icons/fa6";
import classes from '../css/login_img.module.css'
import { Link, useNavigate } from "react-router-dom";
import { useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';

export default function Login() {
    const phoneRef = useRef();
    const passRef = useRef();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const phoneNumber = phoneRef.current.value;
        const password = passRef.current.value;
        try {
            const res = await axios.post(`${API_BASE_URL}/api/auth/signin`, { phoneNumber, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('userName', res.data.user.name);
            localStorage.setItem('userType', res.data.user.type);
            localStorage.setItem('year_stage', res.data.user.grade); // حفظ السنة الدراسية
            alert('تم تسجيل الدخول بنجاح!');
            navigate('/');
        } catch (err) {
            alert(err.response?.data?.message || 'حدث خطأ');
        }
    };

    return <>
        {/* Container */}
        <div className={`flex flex-col justify-center items-center h-full font-GraphicSchool  ${classes.container}`}>

            {/* Mobile image */}
            <div className="lg:hidden">
                <img src={login_img_mop} />
            </div>

            {/* login Form Container */}
            <div className={`w-[100%] flex flex-col justify-center items-center lg:absolute lg:right-24 lg:w-[30%] lg:rounded-4xl lg:top-20 lg:border-8 lg:border-bluetheme-500 ${classes.pc_form}`}>

                {/* login Form */}
                <div className="w-full flex flex-col justify-center items-start gap-5 p-4">
                    <form className="w-full flex flex-col justify-center items-center gap-7 p-4" onSubmit={handleSubmit}>
                        <div className="w-full lg:w-[80%] flex flex-col gap-2.5">
                            <label className='text-end'>رقم الهاتف</label>
                            <input type="tel" ref={phoneRef} className="border-[1.5px] bg-bluetheme-500 border-none text-white  rounded-[3px] p-2 text-center" placeholder="xxxxxxxxxxx" required />
                        </div>
                        <div className="w-full lg:w-[80%] flex flex-col gap-2.5">
                            <label className='text-end labels'>الباسورد</label>
                            <input type="password" ref={passRef} className="border-[1.5px] bg-bluetheme-500 border-none text-white  rounded-[3px] p-2 text-end" placeholder="xxxxxxxxxxx" required />
                        </div>
                        <Link to={'/Reset_password'}>
                            <button type="button" className='text-bluetheme-500 btns hover:text-blue-700'>نسيت الباسورد؟</button>
                        </Link>
                        <button type="submit" className='font-TIDO  rounded-[5px] p-1.5 text-white bg-bluetheme-500 btns w-full lg:w-[80%] lg:mr-auto lg:ml-auto hover:bg-blue-700'>تسجيل</button>
                    </form>

                    <div className="w-full text-center mb-5 labels">
                        <span>معنديش اكونت؟ .</span>
                        <Link to={'/signup'}>
                            <button className='text-bluetheme-500 hover:scale-[1.04] duration-[0.2s] hover:text-blue-700'>أنشئ حسابك</button>
                        </Link>
                    </div>
                </div>

                {/* Social Media */}
                <section className='flex justify-center items-center p-2.5 text-white mb-1.5 gap-5'>
                    <a target="blank" href="https://www.facebook.com/share/1AtQXoXtjJ/" className="icons text-blue-700"><FaFacebook /></a>
                    <a target="blank" href="https://youtube.com/@mr_mostafaelzuhery?feature=shared" className="icons text-red-500"><FaYoutube /></a>
                    <a target="blank" href="https://wa.me/201200598618" className="icons text-green-700"><FaWhatsapp /></a>
                </section>
            </div>
        </div>
    </>;
}
import signup_typo from '../imgs/Signup_typo.png'
import classes from '../css/signup.module.css'
import { Link, useNavigate } from 'react-router-dom'
import { useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';

export default function Signup() {
    const nameRef = useRef();
    const phoneRef = useRef();
    const parentPhoneRef = useRef();
    const centerRef = useRef();
    const grade1Ref = useRef();
    const grade2Ref = useRef();
    const grade3Ref = useRef();
    const passRef = useRef();
    const pass2Ref = useRef();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (passRef.current.value !== pass2Ref.current.value) {
            alert('كلمة المرور غير متطابقة');
            return;
        }
        try {
            // تحديد المرحلة الدراسية المختارة
            let selectedGrade = '';
            if (grade1Ref.current.checked) {
                selectedGrade = grade1Ref.current.value;
            } else if (grade2Ref.current.checked) {
                selectedGrade = grade2Ref.current.value;
            } else if (grade3Ref.current.checked) {
                selectedGrade = grade3Ref.current.value;
            }
            
            await axios.post(`${API_BASE_URL}/api/auth/signup`, {
                name: nameRef.current.value,
                phoneNumber: phoneRef.current.value,
                parentPhoneNumber: parentPhoneRef.current.value,
                center: centerRef.current.value,
                grade: selectedGrade,
                password: passRef.current.value,
                type: 'Student'
            });
            alert('تم إنشاء الحساب بنجاح!');
            navigate('/login');
        } catch (err) {
            alert(err.response?.data?.message || 'حدث خطأ');
        }
    };

    return <>
        {/* container Div */}
        <div className={`w-full h-full flex flex-col justify-start items-center font-GraphicSchool lg:flex-row lg:justify-center lg:items-center relative ${classes.container}`}>

            {/* Mobile Size Typo */}
            <img src={signup_typo} className='w-[250px] h-[250px] md:w-[350px] md:h-[350px] z-10 lg:z-0 lg:hidden' />

            {/* sign_up Form */}
            <form className='flex flex-col justify-between items-center w-[70%] md:w-[100%] gap-5 z-10 lg:z-0 lg:bg-white lg:w-[30%] lg:h-full' onSubmit={handleSubmit}>
                <h2 className='text-bluetheme-500 head2 hidden mb-2 lg:block'>انشاء حساب جديد</h2>

                {/* Full Name */}
                <div className='flex flex-col justify-center items-end gap-3'>
                    <label className='labels text-end'>الأسم الثلاثي</label>
                    <input type="text" placeholder='الأسم الثلاثي' className='bg-bluetheme-500 text-white rounded-[5px] p-1 text-end' ref={nameRef} required />
                </div>

                {/* Mobile Number */}
                <div className=' flex flex-col justify-center items-end gap-3'>
                    <label className='labels text-end'>هاتف الطالب</label>
                    <input type="tel" placeholder='xxxxxxxxxxx' className='bg-bluetheme-500 text-white rounded-[5px] p-1 text-center' ref={phoneRef} required />
                </div>

                {/* Parent Mobile Number */}
                <div className=' flex flex-col justify-center items-end gap-3'>
                    <label className='labels text-end'>هاتف ولي الأمر</label>
                    <input type="tel" placeholder='xxxxxxxxxxx' className='bg-bluetheme-500 text-white rounded-[5px] p-1 text-center' ref={parentPhoneRef} />
                </div>

                {/* Center */}
                <div className=' flex flex-col justify-center items-end gap-3'>
                    <label className='labels text-end'>السنتر</label>
                    <input type="text" className='bg-bluetheme-500 text-white rounded-[5px] p-1' ref={centerRef} />
                </div>

                {/* Grade */}
                <div className=' flex flex-col justify-center items-end gap-3'>
                    <label className='labels text-end'>المرحلة الدراسية</label>
                    <section className='flex justify-center items-center gap-2'>
                        <div className='flex justify-center items-center gap-0.5'>
                            <label className='bg-bluetheme-500 text-white rounded-[5px] p-1 text-[12px] md:text-[15px]'>أولى ثانوي</label>
                            <input name='grade' type="radio" value="أولى ثانوي" ref={grade1Ref} />
                        </div>
                        <div className='flex justify-center items-center gap-0.5'>
                            <label className='bg-bluetheme-500 text-white rounded-[5px] p-1 text-[12px] md:text-[15px]'>تانية ثانوي</label>
                            <input name='grade' type="radio" value="تانية ثانوي" ref={grade2Ref} />
                        </div>
                        <div className='flex justify-center items-center gap-0.5'>
                            <label className='bg-bluetheme-500 text-white rounded-[5px] p-1 text-[12px] md:text-[15px]'>تالتة ثانوي</label>
                            <input name='grade' type="radio" value="تالتة ثانوي" ref={grade3Ref} />
                        </div>
                    </section>
                </div>

                {/* Password & Confirm Password */}
                <div className=' flex flex-col justify-center items-end gap-3'>
                    <label className='labels text-end'>الباسورد</label>
                    <input type="password" placeholder='xxxxxxxxxxx' className='bg-bluetheme-500 text-end text-white rounded-[5px] p-1' ref={passRef} required />
                </div>
                <div className=' flex flex-col justify-center items-end gap-3'>
                    <label className='labels text-end'>تأكيد الباسورد</label>
                    <input type="password" placeholder='xxxxxxxxxxx' className='bg-bluetheme-500 text-end text-white rounded-[5px] p-1' ref={pass2Ref} required />
                </div>

                {/* SignUp Btn */}
                <button type='submit' className='font-TIDO bg-bluetheme-500 hover:scale-[1.04] text-white duration-[0.2s] rounded-[5px] hover:bg-blue-700 p-1 w-[35%]'>تسجيل</button>

                {/* Already Have an Acc */}
                <div className="w-full text-center mb-5 labels">
                    <span>عندي أكونت فعلا.</span>
                    <Link to={'/login'}>
                        <button className='text-bluetheme-500 hover:scale-[1.04] duration-[0.2s] hover:text-blue-700'>تسجيل الدخول</button>
                    </Link>
                </div>
            </form>

            <div className={`lg:w-[70%] lg:h-[100%] hidden lg:relative lg:flex ${classes.side_div}`}></div>
        </div>
    </>;
}

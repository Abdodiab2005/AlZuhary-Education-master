import { MdHome, MdKeyboardDoubleArrowDown, MdOutlineKeyboardDoubleArrowUp, MdOutlineSlowMotionVideo } from "react-icons/md";
import { LuBookOpenText } from "react-icons/lu";
import { useState } from "react";
import classes from '../css/nav.module.css'
import { Link, useNavigate } from "react-router-dom";
import { GoFileDirectoryFill } from "react-icons/go";
import { FaUser } from "react-icons/fa6";
import { FaKey } from "react-icons/fa";
import LogOut from './LogOut';
import { IoMdAddCircleOutline } from "react-icons/io";
import { SiTestcafe } from "react-icons/si";
import { CiLogout } from "react-icons/ci";
import API_BASE_URL from '../apiConfig';

export default function Bottom_nav() {

    const [bar, setBar] = useState(false);
    const userType = localStorage.getItem('userType');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // دوال فتح رابط الواجب أو الملفات حسب سنة الطالب
    const normalizeYearStage = (yearStage) => {
        if (!yearStage) return '';
        if (yearStage === 'أولى ثانوي' || yearStage === '1 ثانوي' || yearStage === 'اولى ثانوي') {
            return 'اولى ثانوي';
        } else if (yearStage === 'تانية ثانوي' || yearStage === '2 ثانوي' || yearStage === 'الثاني الثانوي') {
            return 'الثاني الثانوي';
        } else if (yearStage === 'تالتة ثانوي' || yearStage === '3 ثانوي' || yearStage === 'الثالث الثانوي') {
            return 'الثالث الثانوي';
        }
        return yearStage;
    };

    const openHomeworkLink = () => {
        let yearStage = localStorage.getItem('year_stage');
        yearStage = normalizeYearStage(yearStage);
        if (!yearStage) {
            alert('لم يتم تحديد السنة الدراسية للطالب');
            return;
        }
        fetch(`${API_BASE_URL}/api/homework/${yearStage}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    window.open(data[0].url, '_blank');
                } else if (data.url) {
                    window.open(data.url, '_blank');
                } else {
                    alert('لا يوجد رابط واجب لهذه السنة');
                }
            });
    };

    const openFileLink = () => {
        let yearStage = localStorage.getItem('year_stage');
        yearStage = normalizeYearStage(yearStage);
        if (!yearStage) {
            alert('لم يتم تحديد السنة الدراسية للطالب');
            return;
        }
        fetch(`${API_BASE_URL}/api/files/${yearStage}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    window.open(data[0].url, '_blank');
                } else if (data.url) {
                    window.open(data.url, '_blank');
                } else {
                    alert('لا يوجد رابط ملف لهذه السنة');
                }
            });
    };

    return <>
        <div className="text-center fixed bottom-0  flex flex-col justify-center items-center w-[100%] font-GraphicSchool nav-btn">
            <button className={`text-[2.0rem] text-white font-extrabold ${classes.arrow} bg-bluetheme-500 rounded-[10px] p-1 mb-2 lg:hidden`} onClick={() => setBar(!bar)}>
                {bar ? <MdKeyboardDoubleArrowDown /> : <MdOutlineKeyboardDoubleArrowUp />}
            </button>

            {/* Navbar */}
            <div className={`flex justify-around items-center bg-bluetheme-500 text-white w-[100%] md:w-[80%] lg:w-[max(60%)] gap-1 mr-auto ml-auto rounded-t-xl p-1 ${bar ? `block` : `hidden`} lg:flex lg:fixed lg:bottom-0`}>
                {(userType === 'Admin' || userType === 'Teacher') && (
                    <Link to={'/users'}>
                        <button className="flex flex-col justify-center items-center gap-1">
                            <div className="nav-icons"><FaUser /></div>
                            <span className="nav-btn">المستخدمين</span>
                        </button>
                    </Link>
                )}
                <button className="flex flex-col justify-center items-center gap-1" onClick={openHomeworkLink}>
                    <div className="nav-icons"><LuBookOpenText /></div>
                    <span className="nav-btn">الواجب</span>
                </button>
                <button className="flex flex-col justify-center items-center gap-1" onClick={openFileLink}>
                    <div className="nav-icons"><GoFileDirectoryFill /></div>
                    <span className="nav-btn">الملفات</span>
                </button>
                <Link to={'/'}>
                    <button className="flex flex-col justify-center items-center gap-1">
                        <div className="nav-icons"><MdHome /></div>
                        <span className="nav-btn">الرئيسية</span>
                    </button>
                </Link>
                {(userType === 'Admin' || userType === 'Teacher') && (
                    <Link to={'/HomeworkAndFiles'}>
                        <button className="flex flex-col justify-center items-center gap-1">
                            <div className="nav-icons"><IoMdAddCircleOutline /></div>
                            <span className="nav-btn">اضافة ملفات</span>
                        </button>
                    </Link>
                )}
                {(userType === 'Admin' || userType === 'Teacher') && (
                    <Link to={'/codegen'}>
                        <button className="flex flex-col justify-center items-center gap-1">
                            <div className="nav-icons"><FaKey /></div>
                            <span className="nav-btn">كروت الشحن</span>
                        </button>
                    </Link>
                )}
                {(userType === 'Admin' || userType === 'Teacher') && (
                    <Link to={'/admin_set_test'}>
                        <button className="flex flex-col justify-center items-center gap-1">
                            <div className="nav-icons"><SiTestcafe /></div>
                            <span className="nav-btn">الامتحانات</span>
                        </button>
                    </Link>
                )}
                {/* زر تسجيل الخروج */}
                <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white rounded-xl lg:p-2 p-1">
                    <span className="icons md:hidden"><CiLogout /></span>
                    <span className="nav-btn hidden md:inline-block">تسجيل الخروج</span>
                </button>
            </div>
        </div>
    </>
}
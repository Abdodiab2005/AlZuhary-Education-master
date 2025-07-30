import logo from '../imgs/logo.png'
import { FaPhoneVolume } from "react-icons/fa6";
import classes from '../css/header.module.css'
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaBell } from 'react-icons/fa';
import API_BASE_URL from '../apiConfig';

export default function Header() {

    const [charge, setCharge] = useState(false);
    const [balance, setBalance] = useState(0);
    const [userName, setUserName] = useState('');
    const [rechargeCode, setRechargeCode] = useState('');
    const [rechargeMsg, setRechargeMsg] = useState('');
    const userType = localStorage.getItem('userType');
    const [showNotif, setShowNotif] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        setUserName(localStorage.getItem('userName') || '');
        const token = localStorage.getItem('token');
        if (!token) return;
        axios.get(`${API_BASE_URL}/api/recharge/balance`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => setBalance(res.data.credits || 0))
        .catch(() => setBalance(0));
        // جلب الإشعارات عند التحميل
        if (userType === 'Admin') {
            axios.get(`${API_BASE_URL}/api/auth/notifications/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then(res => {
                setNotifications(res.data);
                // إذا فيه إشعار غير مقروء، افتح البوب أب تلقائياً
                if (Array.isArray(res.data) && res.data.some(n => n.seen === false)) {
                    setShowNotif(true);
                }
            })
            .catch(() => setNotifications([]));
        }
    }, []);

    const handleRecharge = async () => {
        setRechargeMsg('');
        const token = localStorage.getItem('token');
        if (!rechargeCode) {
            setRechargeMsg('يرجى إدخال كود الشحن');
            return;
        }
        try {
            const res = await axios.post(`${API_BASE_URL}/api/recharge/use`, { code: rechargeCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(res.data.credits);
            setRechargeMsg('تم شحن الرصيد بنجاح!');
            setRechargeCode('');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                setRechargeMsg('خطأ: ' + err.response.data.message);
            } else {
                setRechargeMsg('حدث خطأ أثناء الشحن');
            }
        }
    };

    const fetchNotifications = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_BASE_URL}/api/auth/notifications/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
        } catch (err) {
            setNotifications([]);
        }
    };

    // تعليم إشعار كمقروء
    const markAsSeen = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_BASE_URL}/api/auth/notifications/${id}/seen`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (err) {}
    };
    // حذف كل المقروء
    const deleteReadNotifications = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_BASE_URL}/api/auth/notifications/read`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (err) {}
    };

    return <>
        <div className="bg-bluetheme-500 font-GraphicSchool flex justify-between items-center p-1 w-[100%] relative">
            <div className="bg-bluetheme-500 flex flex-col lg:flex-row justify-center items-center gap-0.5 lg:gap-1">
                <span className="text-white price">{balance} جنيه</span>
                <button className="bg-white text-bluetheme-500 text-[0.7rem] md:text-[0.9rem] p-1 rounded-lg" onClick={() => { setCharge(true) }}>شحن كود رصيد</button>
            </div>
            <div className="flex justify-center items-center gap-1">
                {userType === 'Admin' && (
                    <div className="relative">
                        <button className={`bg-white text-bluetheme-500 p-3 rounded-[50%] price ${classes.badge} relative`} onClick={() => { setShowNotif(!showNotif); if (!showNotif) fetchNotifications(); }}>
                            <FaBell />
                            {/* علامة حمراء إذا فيه إشعار غير مقروء */}
                            {notifications.some(n => n.seen === false) && (
                                <span style={{position:'absolute',top:2,right:2,width:12,height:12,background:'red',borderRadius:'50%',display:'inline-block',border:'2px solid white'}}></span>
                            )}
                        </button>
                        {showNotif && (
                            <div className="absolute left-0 top-[110%] bg-white border border-gray-300 rounded-lg shadow-lg min-w-[250px] max-h-[300px] overflow-y-auto z-50">
                                <div className="p-2 font-bold text-bluetheme-500 border-b flex justify-between items-center">
                                    <span>إشعارات تغيير كلمة السر</span>
                                    <button onClick={deleteReadNotifications} className="text-xs bg-red-100 text-red-600 rounded px-2 py-1 hover:bg-red-200">مسح المقروء</button>
                                </div>
                                {notifications.length === 0 && <div className="p-2 text-gray-500">لا يوجد إشعارات</div>}
                                {notifications.map((n, i) => (
                                    <div key={n._id || i} className={`p-2 border-b last:border-b-0 flex flex-col cursor-pointer ${n.seen ? 'bg-gray-100' : 'bg-yellow-50 font-bold'}`} onClick={() => !n.seen && markAsSeen(n._id)}>
                                        <span>الاسم: <span className="font-bold">{n.name}</span></span>
                                        <span>رقم الهاتف: <span className="font-mono">{n.phoneNumber}</span></span>
                                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString('ar-EG')}</span>
                                        {n.seen && <span className="text-green-600 text-xs mt-1">مقروء</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <a href='https://wa.me/201279552128' target='_blank'>
                    <button className={`bg-white text-bluetheme-500 p-3 rounded-[50%] price`}><FaPhoneVolume /></button>
                </a >
                <img src={logo} className="w-[65px] h-[65px] rounded-[50%] hidden md:inline-block" alt="Profile Photo" />
            </div>

            {/* Recharge popup */}
            <div className={`absolute bg-white border-4 border-bluetheme-500 rounded-2xl flex flex-col justify-between w-[100%] md:w-[40%] lg:w-[30%] items-center p-2 gap-2 duration-[2s] ${charge ? `top-[100%]` : `bottom-[100%]`}`}>
                <h1 className='buy bg-bluetheme-500 text-white rounded-lg p-2 '>شحن كود رصيد</h1>
                <span className='enter flex justify-center items-center gap-0.5'>ادخل الكود</span>
                <input type="text" value={rechargeCode} onChange={e => setRechargeCode(e.target.value)} className='bg-bluetheme-500 text-white p-1 rounded-xl border-0 text-center' placeholder='ادخل كود الشحن' />
                {rechargeMsg && <div className={`mt-1 ${rechargeMsg.startsWith('تم') ? 'text-green-600' : 'text-red-600'}`}>{rechargeMsg}</div>}
                <section className='flex justify-around items-center w-[100%]'>
                    <button className='bg-bluetheme-500 text-white rounded-lg p-0.5 labels' onClick={async (e) => { e.preventDefault(); await handleRecharge(); }}>تأكيد</button>
                    <button className='bg-bluetheme-500 text-white rounded-lg p-0.5 labels' onClick={() => { setCharge(false); setRechargeMsg(''); setRechargeCode(''); }}>الغاء</button>
                </section>
            </div>
        </div>
    </>
}
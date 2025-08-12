// معالج الـ Token وإعادة تسجيل الدخول التلقائي
import axios from 'axios';
import API_BASE_URL from '../apiConfig';

// إعداد interceptor للتعامل مع أخطاء الـ token
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // إذا كان الخطأ متعلق بالـ token، احذف البيانات المحلية وأعد توجيه المستخدم
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userType');
      localStorage.removeItem('year_stage');
      localStorage.removeItem('userData');
      
      // إظهار رسالة للمستخدم
      alert('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى');
      
      // إعادة توجيه إلى صفحة تسجيل الدخول
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// دالة للتحقق من صلاحية الـ token
export const checkTokenValidity = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return false;
  }

  try {
    await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return true;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // حذف البيانات المحلية
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userType');
      localStorage.removeItem('year_stage');
      localStorage.removeItem('userData');
      return false;
    }
    return true; // إذا كان خطأ آخر، نفترض أن الـ token صالح
  }
};

// دالة لإضافة الـ token للـ headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}; 
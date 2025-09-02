// معالج الـ Token وإعادة تسجيل الدخول التلقائي
import axios from 'axios';
import API_BASE_URL from '../apiConfig';

// إعداد interceptor للتعامل مع أخطاء الـ token
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // التحقق من أن الخطأ 401 أو 403 يتعلق بالتوكن وليس بصلاحيات أخرى
    if (error.response?.status === 401) {
      // التحقق من أن الطلب من صفحة الكورسات
      const isCoursePage = window.location.pathname.includes('/course/');
      
      if (isCoursePage) {
        // في صفحة الكورسات، لا نحذف الـ token تلقائياً
        // نترك المعالجة للصفحة نفسها
        return Promise.reject(error);
      }
      
      // خطأ 401 يعني أن التوكن غير صالح أو منتهي الصلاحية
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
    // خطأ 403 لا يعني بالضرورة انتهاء صلاحية التوكن، قد يكون مشكلة في الصلاحيات
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
    // في حالة وجود خطأ في الشبكة أو الخادم، نعتبر الـ token صالح
    if (!error.response) {
      return true;
    }
    
    if (error.response?.status === 401) {
      // خطأ 401 يعني أن التوكن غير صالح أو منتهي الصلاحية
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userType');
      localStorage.removeItem('year_stage');
      localStorage.removeItem('userData');
      return false;
    }
    
    // خطأ 403 أو أي خطأ آخر لا يعني بالضرورة انتهاء صلاحية التوكن
    return true;
  }
};

// دالة لإضافة الـ token للـ headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}; 
import { Link } from "react-router-dom";

export default function Baught_single_lec({ courseId, lessonId }) {
    if (!courseId || !lessonId) return null;
    return (
        <Link to={`/course/${courseId}/lesson/${lessonId}`}>
            <span className="text-white bg-green-700 rounded-lg p-1 enter">دخول الحصة</span>
        </Link>
    );
}
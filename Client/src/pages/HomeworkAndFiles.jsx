import { useState, useEffect } from "react";
import API_BASE_URL from '../apiConfig';
import Bottom_nav from "../components/Bottom_nav";

export default function HomeworkAndFiles() {
    // State for homework and files
    const [homeworkLinks, setHomeworkLinks] = useState([]);
    const [fileLinks, setFileLinks] = useState([]);
    const [selectedHomeworkYear, setSelectedHomeworkYear] = useState("اولى ثانوي");
    const [selectedFileYear, setSelectedFileYear] = useState("اولى ثانوي");
    const [homeworkUrl, setHomeworkUrl] = useState("");
    const [fileUrl, setFileUrl] = useState("");

    // Fetch homework links for selected year
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/homework/${selectedHomeworkYear}`)
            .then(res => res.json())
            .then(data => setHomeworkLinks(data));
    }, [selectedHomeworkYear]);

    // Fetch file links for selected year
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/files/${selectedFileYear}`)
            .then(res => res.json())
            .then(data => setFileLinks(data));
    }, [selectedFileYear]);

    // Add homework link
    const addHomework = () => {
        if (!homeworkUrl) return;
        fetch(`${API_BASE_URL}/api/homework`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: homeworkUrl, year_stage: selectedHomeworkYear })
        })
            .then(res => res.json())
            .then(() => {
                setHomeworkUrl("");
                fetch(`${API_BASE_URL}/api/homework/${selectedHomeworkYear}`)
                    .then(res => res.json())
                    .then(data => setHomeworkLinks(data));
            });
    };

    // Add file link
    const addFile = () => {
        if (!fileUrl) return;
        fetch(`${API_BASE_URL}/api/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: fileUrl, year_stage: selectedFileYear })
        })
            .then(res => res.json())
            .then(() => {
                setFileUrl("");
                fetch(`${API_BASE_URL}/api/files/${selectedFileYear}`)
                    .then(res => res.json())
                    .then(data => setFileLinks(data));
            });
    };

    const userType = localStorage.getItem('userType');

    return <>
        <div className="h-screen w-full flex justify-center items-center font-GraphicSchool">
            <div className="font-GraphicSchool flex flex-col items-center justify-between gap-25 bg-gray-300 w-[100%] md:w-[80%] lg:w-[60%]  rounded-2xl p-3">
                <h1 className="head1 text-bluetheme-500 font-extrabold text-center">الواجبات و الملفات</h1>
                { (userType === 'Admin' || userType === 'Teacher') && <>
                <section className="rounded-lg flex flex-col md:flex-row items-center gap-2 justify-center">
                    <input type="url" placeholder="ادخل لينك الواجب" className="rounded-lg text-center p-1.5 md:rounded-r-lg  border-2 border-bluetheme-500" value={homeworkUrl} onChange={e => setHomeworkUrl(e.target.value)} />
                    <select className="bg-bluetheme-500 md:rounded-l-lg p-2 text-center rounded-lg" value={selectedHomeworkYear} onChange={e => setSelectedHomeworkYear(e.target.value)}>
                        <option value="اولى ثانوي">اولى ثانوي</option>
                        <option value="الثاني الثانوي">الثاني الثانوي</option>
                        <option value="الثالث الثانوي" className="rounded-b-lg">الثالث الثانوي</option>
                    </select>
                    <button type="button" onClick={addHomework}>إضافة</button>
                </section>
                <section className="rounded-lg flex flex-col md:flex-row items-center gap-2 justify-center">
                    <input type="url" placeholder="ادخل لينك الملفات" className="rounded-lg text-center p-1.5 md:rounded-r-lg  border-2 border-bluetheme-500" value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
                    <select className="bg-bluetheme-500 md:rounded-l-lg p-2 text-center rounded-lg" value={selectedFileYear} onChange={e => setSelectedFileYear(e.target.value)}>
                        <option value="اولى ثانوي">اولى ثانوي</option>
                        <option value="الثاني الثانوي">الثاني الثانوي</option>
                        <option value="الثالث الثانوي" className="rounded-b-lg">الثالث الثانوي</option>
                    </select>
                    <button type="button" onClick={addFile}>إضافة</button>
                </section>
                </>}
            </div>
            <Bottom_nav />
        </div>
    </>
}
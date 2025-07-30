import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter,RouterProvider } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Error from './pages/Error.jsx'
import Reset_pass from './pages/Reset_pass.jsx'
import Index from './pages/Index.jsx'
import Course from './pages/Course.jsx'
import Lectuer from './pages/Lectuer.jsx'
import Users from './pages/Users.jsx'
import CodeGenerator from './pages/CodeGenerator.jsx'
import HomeworkAndFiles from './pages/HomeworkAndFiles.jsx'
import Admin_set_test from './pages/Admin_set_test.jsx'
import Student_test from './pages/Student_test.jsx'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login/>
  },
  {
    path: '/signup',
    element: <Signup/>
  },
  {
    path: '*',
    element: <Error/>
  },
  {
    path: '/Reset_password',
    element: <Reset_pass/>
  },
  {
    path: '/course/:courseId',
    element: <Course/>
  },
  {
    path: '/course/:courseId/lesson/:lessonId',
    element: <Lectuer/>
  },
  {
    path: '/users',
    element: <Users/>
  },
  {
    path: '/',
    element: <Index/>
  },
  {
    path: '/codegen',
    element: <CodeGenerator/>
  },
  {
    path: '/HomeworkAndFiles',
    element: <HomeworkAndFiles/>
  },
  {
    path: '/adimn_set_test',
    element: <Admin_set_test/>
  },
  {
    path: '/Student_test',
    element: <Student_test/>
  },
  {
    path: '/exam/:lessonId',
    element: <Student_test/>
  }
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

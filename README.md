# AI Course Generator 🚀

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)

A full-stack web application that leverages the Google Gemini API to dynamically generate structured educational courses, complete with modules and quizzes, from a single user prompt.

**Live Demo:** [https://ai-course-generator-ahcxgxajcuc8fdc6.centralindia-01.azurewebsites.net/](https://ai-course-generator-ahcxgxajcuc8fdc6.centralindia-01.azurewebsites.net/)

---


## ✨ Features

- **AI-Powered Content:** Utilizes the Google Gemini API to generate comprehensive course content, including detailed module notes and quizzes.
- **User Authentication:** Secure user registration and login system using JWT and bcrypt for password hashing.
- **Personalized Dashboard:** Users can view and manage their saved courses.
- **Dynamic Module Generation:** Automatically creates a list of relevant module titles based on the initial course prompt.
- **Save & Resume:** Course progress and generated content are saved to an Azure SQL database via Sequelize.
- **PDF Export:** Export generated module content and quizzes to a downloadable PDF document.
- **Responsive Design:** A clean and modern user interface built with React and Tailwind CSS.

---

## 🛠️ Tech Stack

- **Frontend:**
  - React.js
  - Vite
  - Tailwind CSS
  - Axios
  - React Router
- **Backend:**
  - Node.js
  - Express.js
  - Sequelize ORM
- **Database:**
  - Azure SQL
- **Authentication:**
  - JSON Web Tokens (JWT)
  - bcrypt.js
- **AI:**
  - Google Gemini API
- **Deployment:**
  - Microsoft Azure App Service (Linux)
  - CI/CD with GitHub Actions




This project is licensed under the MIT License. See the `LICENSE` file for details.

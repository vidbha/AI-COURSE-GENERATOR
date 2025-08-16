# AI Course Generator 🚀

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)

A full-stack web application that leverages the Google Gemini API to dynamically generate structured educational courses, complete with modules and quizzes, from a single user prompt.

**Live Demo:** [https://ai-course-generator-ahcxgxajcuc8fdc6.centralindia-01.azurewebsites.net/](https://ai-course-generator-ahcxgxajcuc8fdc6.centralindia-01.azurewebsites.net/)

---

![AI Course Generator Screenshot](https://i.imgur.com/your-screenshot-url.png) 
*(Suggestion: Take a screenshot of your app's dashboard and upload it to a site like Imgur, then replace the URL above.)*

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

---

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

- Node.js (v18 or later recommended)
- Git

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/AI-COURSE-GENERATOR.git](https://github.com/your-username/AI-COURSE-GENERATOR.git)
    cd AI-COURSE-GENERATOR
    ```

2.  **Install all dependencies:**
    This command will install dependencies for the root, server, and client.
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the `server/` directory and add the following variables:
    ```
    # Your database connection details
    DB_HOST=your_database_host
    DB_USER=your_database_user
    DB_PASSWORD=your_database_password
    DB_NAME=your_database_name

    # Your Google Gemini API Key(s)
    GEMINI_API_KEYS=your_gemini_api_key

    # A secret string for JWT
    JWT_SECRET=your_super_secret_string

    # The origin URL of your client (for local development)
    CLIENT_ORIGIN=http://localhost:5173
    ```

4.  **Run the application:**
    This will start both the backend server and the frontend Vite development server concurrently.
    - In one terminal, start the backend:
      ```bash
      npm --prefix server start
      ```
    - In a second terminal, start the frontend:
      ```bash
      npm --prefix client dev
      ```

    Your application should now be running at `http://localhost:5173`.

---

## ☁️ Deployment

This application is configured for continuous deployment to **Microsoft Azure App Service** using **GitHub Actions**. The workflow is defined in the `.github/workflows/` directory. Any push to the `main` branch will automatically trigger a new build and deployment to the production environment.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

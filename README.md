# Kloterby MEME

Full-stack application for managing "Kloter" (Arisan) with Next.js frontend and FastAPI backend.

## Project Structure

- `backend/`: FastAPI application with SQLAlchemy and Alembic.
- `frontend/`: Next.js application with React and Tailwind CSS.

## Getting Started

### Backend Setup

1. Navigate to `backend/`
2. Create a virtual environment: `python -m venv venv`
3. Activate it:
   - Windows: `venv\Scripts\activate`
   - Linux/macOS: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Set up your `.env` file (refer to `.env.example`)
6. Run migrations: `alembic upgrade head`
7. Start the server: `uvicorn app.main:app --reload`

### Frontend Setup

1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Set up your `.env.local` file
4. Start the development server: `npm run dev`

## Deployment

To deploy to GitHub:

1. Create a new repository on GitHub.
2. Run the following commands:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

# **Spatial Search**

**Demo Video:** [Watch on YouTube](https://www.youtube.com/watch?v=EHRICfNJwWk)

**Model File (model.pt):** [Download from Google Drive](https://drive.google.com/file/d/12F9kFGWU75lp0WYr6F8ijPwvAB34KtTE/view)

## **Overview**

This project is a computer vision application that tracks and catalogs objects over time. It uses a YOLO model to process a video feed, detect specific objects (e.g., Keys, Wallets), and record their spatial coordinates and timestamps. The data is stored in a SQLite database, allowing users to search for an object and scrub through its historical locations using a web dashboard.

## **Features**

* **Live Object Detection:** Processes video input and identifies objects based on predefined confidence thresholds.  
* **Spatial Logging:** Saves snapshots and bounding box coordinates of detected objects at regular intervals.  
* **Timeline Scrubbing:** Allows users to view the historical locations of specific items through a slider interface.  
* **Filtering System:** Search cataloged items by name, date, or time.  
* **Web Dashboard:** A lightweight frontend built with HTML, Tailwind CSS, and vanilla JavaScript.

## **Tech Stack**

* **Backend:** Python, FastAPI, SQLAlchemy (SQLite)  
* **Computer Vision:** Ultralytics YOLO, OpenCV  
* **Frontend:** HTML, JavaScript, Tailwind CSS

## **Setup and Installation**

1. **Clone the repository:**

git clone \[https://github.com/RealRuthvik/Lost-Object-Detection\](https://github.com/RealRuthvik/Lost-Object-Detection)

2. **Install dependencies:**  
   Ensure you have Python installed. Install the required packages:

pip install fastapi uvicorn opencv-python ultralytics sqlalchemy

3. **Download required assets:**  
* Download the model.pt file from the [Google Drive link](https://drive.google.com/file/d/12F9kFGWU75lp0WYr6F8ijPwvAB34KtTE/view).  
* Place model.pt in the root directory of the project.  
* Add a demo video file named demo.mp4 from [this Google Drive folder](https://drive.google.com/drive/folders/1ohFCQBKuIucftmpY3E44RqKcELh7SHiz) to the root directory.  
4. **Run the server:**  
   Start the FastAPI application using Uvicorn.

uvicorn server:app \--host 127.0.0.1 \--port 8000 \--reload

5. **Access the dashboard:**  
   Open a web browser and navigate to: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

## **Configuration**

* **Confidence Thresholds:** Adjustable within server.py in the CONFIDENCE\_THRESHOLDS dictionary.  
* **Scan Intervals:** Modify SCAN\_INTERVAL in server.py to change how frequently snapshots are saved to the database.  
* **Playback Speed:** Adjust PLAYBACK\_SPEED in server.py to control the video processing rate.

**Disclaimer:** Development of Spatial Search was assisted by Google Gemini. All code and implementations were reviewed and integrated by the project team.

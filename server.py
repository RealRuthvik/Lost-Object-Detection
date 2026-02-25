import os
import time
import datetime
import threading
import cv2
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from ultralytics import YOLO

DATABASE_URL = "sqlite:///./spatial_search.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SpatialLog(Base):
    __tablename__ = "spatial_logs"
    id = Column(Integer, primary_key=True, index=True)
    object_name = Column(String)
    x_coord = Column(Float)
    y_coord = Column(Float)
    w_coord = Column(Float)
    h_coord = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    image_filename = Column(String)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

model = YOLO("yolov8n.pt")
cap = cv2.VideoCapture(0)

def detection_loop():
    db = SessionLocal()
    while True:
        ret, frame = cap.read()
        if ret:
            results = model(frame, verbose=False)
            if len(results[0].boxes) > 0:
                ts = int(time.time())
                fname = f"snap_{ts}.jpg"
                filepath = os.path.join(UPLOAD_DIR, fname)
                cv2.imwrite(filepath, frame)
                
                for box in results[0].boxes:
                    label = model.names[int(box.cls[0])].title()
                    x1, y1, x2, y2 = box.xyxyn[0].tolist()
                    
                    w = (x2 - x1) * 100
                    h = (y2 - y1) * 100
                    cx = x1 * 100
                    cy = y1 * 100
                    
                    new_entry = SpatialLog(
                        object_name=label,
                        x_coord=round(cx, 2),
                        y_coord=round(cy, 2),
                        w_coord=round(w, 2),
                        h_coord=round(h, 2),
                        image_filename=fname
                    )
                    db.add(new_entry)
                db.commit()
        time.sleep(10)

threading.Thread(target=detection_loop, daemon=True).start()

def generate_frames():
    while True:
        success, frame = cap.read()
        if not success:
            break
        else:
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.get("/api/stream")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/api/data")
def get_data(db: Session = Depends(get_db)):
    logs = db.query(SpatialLog).order_by(SpatialLog.timestamp.asc()).all()
    
    grouped_data = {}
    for log in logs:
        name = log.object_name
        if name not in grouped_data:
            grouped_data[name] = {"name": name, "history": []}
        
        dt = log.timestamp
        time_str = dt.strftime("%H:%M")
        date_str = dt.strftime("%Y-%m-%d")
        
        grouped_data[name]["history"].append({
            "time": time_str,
            "date": date_str,
            "x": log.x_coord,
            "y": log.y_coord,
            "w": log.w_coord,
            "h": log.h_coord,
            "img": f"http://127.0.0.1:8000/uploads/{log.image_filename}"
        })
        
    return list(grouped_data.values())

@app.post("/api/reset")
def reset_data(db: Session = Depends(get_db)):
    db.query(SpatialLog).delete()
    db.commit()
    for file in os.listdir(UPLOAD_DIR):
        os.remove(os.path.join(UPLOAD_DIR, file))
    return {"status": "cleared"}
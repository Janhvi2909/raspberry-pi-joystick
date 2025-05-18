from websockets.server import serve
import asyncio
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class JoystickController:
    def __init__(self):
        self.speed = 0
        self.direction = {"x": 0, "y": 0}
    
    def update_speed(self, speed):
        """Update speed value (-100 to 100)"""
        self.speed = max(-100, min(100, speed))
        logger.info(f"Speed updated to: {self.speed}")
        # TODO: Add your motor control logic here
        
    def update_direction(self, x, y):
        """Update direction values (x and y between -100 and 100)"""
        self.direction["x"] = max(-100, min(100, x))
        self.direction["y"] = max(-100, min(100, y))
        logger.info(f"Direction updated to: x={self.direction['x']}, y={self.direction['y']}")
        # TODO: Add your steering control logic here

controller = JoystickController()

async def handle_client(websocket):
    logger.info("Client connected")
    try:
        async for message in websocket:
            data = json.loads(message)
            if data["type"] == "speed":
                controller.update_speed(data["value"])
            elif data["type"] == "direction":
                controller.update_direction(data["x"], data["y"])
    except Exception as e:
        logger.error(f"Error handling client: {e}")
    finally:
        logger.info("Client disconnected")

async def main():
    async with serve(handle_client, "0.0.0.0", 8765):
        logger.info("Server started on ws://0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main()) 
from ..extensions import db
from bcrypt import gensalt, hashpw, checkpw

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, default="Usuario")
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)

    def set_password(self, password):
        self.password = hashpw(password.encode('utf-8'), gensalt()).decode('utf-8')
        
    def check_password(self, password):
        return checkpw(password.encode('utf-8'), self.password.encode('utf-8'))
    
    def __repr__(self):
    # Representación en cadena para debugging
        return f"<User {self.id}: {self.email}>"
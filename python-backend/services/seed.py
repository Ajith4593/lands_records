"""Seed initial data"""
from models.user import User
from argon2 import PasswordHasher
from nanoid import generate

ph = PasswordHasher()

def seed_initial_data():
    """Seed initial users if database is empty"""
    try:
        user_count = User.objects.count()
        
        if user_count == 0:
            print('[SEED] Seeding initial users...')
            
            # Administrator
            User(
                user_id='USR-ADMIN01',
                username='admin',
                password_hash=ph.hash('Admin@LandRecords2024'),
                role='administrator',
                full_name='System Administrator',
                email='admin@landrecords.local',
                is_active=True
            ).save()
            
            # Registration Officer
            User(
                user_id='USR-OFFICER01',
                username='officer1',
                password_hash=ph.hash('Officer@2024'),
                role='registration_officer',
                full_name='Registration Officer 1',
                email='officer1@landrecords.local',
                is_active=True
            ).save()
            
            # Auditor
            User(
                user_id='USR-AUDITOR01',
                username='auditor1',
                password_hash=ph.hash('Auditor@2024'),
                role='auditor',
                full_name='Auditor 1',
                email='auditor1@landrecords.local',
                is_active=True
            ).save()
            
            # Customer
            User(
                user_id='USR-CUSTOMER01',
                username='customer1',
                password_hash=ph.hash('Customer@2024'),
                role='customer',
                full_name='Customer 1',
                email='customer1@landrecords.local',
                is_active=True
            ).save()
            
            print('[SEED] Created 4 initial users')
        else:
            print(f'[SEED] Database already seeded ({user_count} users exist)')
    
    except Exception as e:
        print(f'[SEED] Error: {e}')

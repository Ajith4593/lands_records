"""Land Record Model"""
from mongoengine import (Document, StringField, FloatField, DateTimeField,
                         BooleanField, DictField, IntField, EmbeddedDocument,
                         EmbeddedDocumentField)
from datetime import datetime

class Property(EmbeddedDocument):
    """Property details embedded document"""
    price = FloatField(required=True)
    transaction_date = DateTimeField(required=True)
    postcode = StringField(max_length=20)
    property_type = StringField(max_length=50)
    new_build = BooleanField(default=False)
    duration = StringField(max_length=20)
    paon = StringField(max_length=100)
    saon = StringField(max_length=100)
    street = StringField(max_length=200)
    locality = StringField(max_length=100)
    town_city = StringField(max_length=100)
    district = StringField(max_length=100)
    county = StringField(max_length=100)

class SyntheticDemo(EmbeddedDocument):
    """Synthetic demo data embedded document"""
    is_synthetic = BooleanField(default=True)
    parcel_id = StringField(max_length=50)
    survey_number = StringField(max_length=50)
    owner_id = StringField(max_length=100)
    owner_name = StringField(max_length=200)
    land_area = FloatField()
    ownership_status = StringField(max_length=50)
    mortgage_status = StringField(max_length=50)
    encumbrance_status = StringField(max_length=50)
    dispute_status = StringField(max_length=50)

class Security(EmbeddedDocument):
    """Security information embedded document"""
    record_hash = StringField()
    digital_signature = StringField()
    public_key = StringField()
    pqc_algorithm = StringField()
    signature_status = StringField(max_length=50)
    tamper_status = StringField(max_length=50)
    signed_at = DateTimeField()
    verified_at = DateTimeField()
    risk_score = IntField(default=0)
    risk_band = StringField(max_length=20, default='LOW')
    risk_indicators = DictField()

class LandRecord(Document):
    """Land Record model"""
    
    meta = {
        'collection': 'land_records',
        'indexes': [
            'land_record_id',
            'transaction_id',
            'owner_user_id',
            'property.postcode',
            'property.town_city',
            'security.tamper_status'
        ]
    }
    
    land_record_id = StringField(required=True, unique=True)
    transaction_id = StringField(required=True, unique=True)
    
    property = EmbeddedDocumentField(Property, required=True)
    synthetic_demo = EmbeddedDocumentField(SyntheticDemo)
    security = EmbeddedDocumentField(Security, required=True)
    
    owner_user_id = StringField()
    created_by = StringField()
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'land_record_id': self.land_record_id,
            'transaction_id': self.transaction_id,
            'property': {
                'price': self.property.price,
                'transaction_date': self.property.transaction_date.isoformat() if self.property.transaction_date else None,
                'postcode': self.property.postcode,
                'property_type': self.property.property_type,
                'new_build': self.property.new_build,
                'duration': self.property.duration,
                'paon': self.property.paon,
                'saon': self.property.saon,
                'street': self.property.street,
                'locality': self.property.locality,
                'town_city': self.property.town_city,
                'district': self.property.district,
                'county': self.property.county,
            } if self.property else {},
            'synthetic_demo': {
                'is_synthetic': self.synthetic_demo.is_synthetic,
                'parcel_id': self.synthetic_demo.parcel_id,
                'survey_number': self.synthetic_demo.survey_number,
                'owner_id': self.synthetic_demo.owner_id,
                'owner_name': self.synthetic_demo.owner_name,
                'land_area': self.synthetic_demo.land_area,
                'ownership_status': self.synthetic_demo.ownership_status,
                'mortgage_status': self.synthetic_demo.mortgage_status,
                'encumbrance_status': self.synthetic_demo.encumbrance_status,
                'dispute_status': self.synthetic_demo.dispute_status,
            } if self.synthetic_demo else {},
            'security': {
                'record_hash': self.security.record_hash,
                'digital_signature': self.security.digital_signature,
                'public_key': self.security.public_key,
                'pqc_algorithm': self.security.pqc_algorithm,
                'signature_status': self.security.signature_status,
                'tamper_status': self.security.tamper_status,
                'signed_at': self.security.signed_at.isoformat() if self.security.signed_at else None,
                'verified_at': self.security.verified_at.isoformat() if self.security.verified_at else None,
                'risk_score': self.security.risk_score,
                'risk_band': self.security.risk_band,
                'risk_indicators': self.security.risk_indicators,
            } if self.security else {},
            'owner_user_id': self.owner_user_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

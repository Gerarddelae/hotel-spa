"""Agregando la tabla Archivo

Revision ID: f7d06231d9ec
Revises: 7b01d3a6f18a
Create Date: 2025-04-01 12:04:48.818426

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7d06231d9ec'
down_revision = '7b01d3a6f18a'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('archivo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('booking_id', sa.Integer(), nullable=False),
    sa.Column('cliente_id', sa.Integer(), nullable=False),
    sa.Column('habitacion_id', sa.Integer(), nullable=False),
    sa.Column('check_in', sa.DateTime(), nullable=False),
    sa.Column('check_out', sa.DateTime(), nullable=False),
    sa.Column('tipo_habitacion', sa.String(length=50), nullable=False),
    sa.Column('num_huespedes', sa.Integer(), nullable=False),
    sa.Column('metodo_pago', sa.String(length=50), nullable=False),
    sa.Column('estado', sa.String(length=20), nullable=False),
    sa.Column('notas', sa.Text(), nullable=True),
    sa.Column('valor_reservacion', sa.Float(), nullable=False),
    sa.Column('notificado', sa.Boolean(), nullable=True),
    sa.Column('fecha_archivo', sa.DateTime(), nullable=False),
    sa.Column('motivo', sa.String(length=100), nullable=True),
    sa.ForeignKeyConstraint(['cliente_id'], ['client.id'], ),
    sa.ForeignKeyConstraint(['habitacion_id'], ['room.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('archivo')
    # ### end Alembic commands ###

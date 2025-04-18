"""corregido clave foranea archivo

Revision ID: 6ea65d165867
Revises: c2bb0dd1b071
Create Date: 2025-04-05 16:45:43.564437

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6ea65d165867'
down_revision = 'c2bb0dd1b071'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('income',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('booking_id', sa.Integer(), nullable=True),
    sa.Column('archive_id', sa.Integer(), nullable=True),
    sa.Column('cliente_id', sa.Integer(), nullable=False),
    sa.Column('nombre_cliente', sa.String(length=120), nullable=False),
    sa.Column('documento', sa.String(length=20), nullable=False),
    sa.Column('fecha_pago', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('monto', sa.Float(), nullable=False),
    sa.Column('metodo_pago', sa.String(length=50), nullable=False),
    sa.Column('estado_pago', sa.String(length=20), nullable=False),
    sa.Column('notas', sa.Text(), nullable=True),
    sa.CheckConstraint('(booking_id IS NOT NULL AND archive_id IS NULL) OR (booking_id IS NULL AND archive_id IS NOT NULL)', name='check_income_source'),
    sa.ForeignKeyConstraint(['archive_id'], ['archivo.id'], ),
    sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ),
    sa.ForeignKeyConstraint(['cliente_id'], ['client.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('income')
    # ### end Alembic commands ###

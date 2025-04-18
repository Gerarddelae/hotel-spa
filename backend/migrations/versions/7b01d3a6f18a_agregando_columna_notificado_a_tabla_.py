"""Agregando columna notificado a tabla Booking

Revision ID: 7b01d3a6f18a
Revises: f935926a8729
Create Date: 2025-04-01 10:37:21.031221

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7b01d3a6f18a'
down_revision = 'f935926a8729'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('booking', schema=None) as batch_op:
        batch_op.add_column(sa.Column('notificado', sa.Boolean(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('booking', schema=None) as batch_op:
        batch_op.drop_column('notificado')

    # ### end Alembic commands ###

"""Corrección de migraciones

Revision ID: 062af818c4fb
Revises: fabc20a0cfa5
Create Date: 2025-03-10 18:01:38.220361

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '062af818c4fb'
down_revision = 'fabc20a0cfa5'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('nombre',
               existing_type=sa.VARCHAR(length=100),
               nullable=False,
               existing_server_default=sa.text("'Usuario'"))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('nombre',
               existing_type=sa.VARCHAR(length=100),
               nullable=True,
               existing_server_default=sa.text("'Usuario'"))

    # ### end Alembic commands ###

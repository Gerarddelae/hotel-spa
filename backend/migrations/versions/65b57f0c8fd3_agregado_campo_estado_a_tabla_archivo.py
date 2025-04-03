"""agregado campo estado a tabla archivo

Revision ID: 65b57f0c8fd3
Revises: 554a3ef0dacc
Create Date: 2025-04-03 11:16:48.214972

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '65b57f0c8fd3'
down_revision = '554a3ef0dacc'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('archivo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('estado', sa.String(length=20), server_default="pendiente", nullable=False))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('archivo', schema=None) as batch_op:
        batch_op.drop_column('estado')

    # ### end Alembic commands ###

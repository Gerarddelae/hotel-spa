"""Corrección campo fecha_archivo en Archivo

Revision ID: 554a3ef0dacc
Revises: 71ae51b22e37
Create Date: 2025-04-02 17:40:37.344644

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '554a3ef0dacc'
down_revision = '71ae51b22e37'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('apscheduler_jobs', schema=None) as batch_op:
        batch_op.drop_index('ix_apscheduler_jobs_next_run_time')

    op.drop_table('apscheduler_jobs')
    with op.batch_alter_table('archivo', schema=None) as batch_op:
        batch_op.drop_column('motivo')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('archivo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('motivo', sa.VARCHAR(length=100), nullable=True))

    op.create_table('apscheduler_jobs',
    sa.Column('id', sa.VARCHAR(length=191), nullable=False),
    sa.Column('next_run_time', sa.FLOAT(), nullable=True),
    sa.Column('job_state', sa.BLOB(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('apscheduler_jobs', schema=None) as batch_op:
        batch_op.create_index('ix_apscheduler_jobs_next_run_time', ['next_run_time'], unique=False)

    # ### end Alembic commands ###

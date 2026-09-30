"""Run the delivered progress SQL against SQLite; no mobile runtime required."""
from pathlib import Path
import re
import sqlite3
import unittest

source = Path(__file__).resolve().parents[1] / 'src/features/getting-started/setup-progress.ts'
query = re.search(r'SETUP_PROGRESS_SQL = `([^`]+)`', source.read_text()).group(1)

class ProgressQueryTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.executescript("""
            CREATE TABLE local_accounts (user_id TEXT, id TEXT, status TEXT, sync_status TEXT);
            CREATE TABLE local_transactions (user_id TEXT, id TEXT, type TEXT, deleted_at TEXT, sync_status TEXT);
        """)
    def tearDown(self):
        self.db.close()
    def progress(self, user='alice'):
        return self.db.execute(query, (user, user)).fetchone()
    def account(self, status='active', user='alice', sync='pending'):
        self.db.execute('INSERT INTO local_accounts VALUES (?, ?, ?, ?)', (user, 'a', status, sync))
    def transaction(self, kind='expense', user='alice', deleted=None, sync='pending'):
        self.db.execute('INSERT INTO local_transactions VALUES (?, ?, ?, ?, ?)', (user, 't', kind, deleted, sync))
    def test_empty_database(self):
        self.assertEqual(self.progress(), (0, 0))
    def test_pending_local_saves_count_before_sync(self):
        self.account()
        self.transaction()
        self.assertEqual(self.progress(), (1, 1))
    def test_income_counts(self):
        self.transaction(kind='income')
        self.assertEqual(self.progress(), (0, 1))
    def test_adjustment_and_transfer_do_not_count(self):
        self.transaction(kind='adjustment')
        self.transaction(kind='transfer')
        self.assertEqual(self.progress(), (0, 0))
    def test_soft_deleted_transaction_does_not_count(self):
        self.transaction(deleted='2026-09-29T12:00:00Z')
        self.assertEqual(self.progress(), (0, 0))
    def test_archived_and_inactive_accounts_do_not_count(self):
        self.account(status='archived')
        self.account(status='inactive')
        self.assertEqual(self.progress(), (0, 0))
    def test_other_users_are_excluded_from_both_facts(self):
        self.account(user='bob')
        self.transaction(user='bob')
        self.assertEqual(self.progress(), (0, 0))
        self.assertEqual(self.progress('bob'), (1, 1))
    def test_synced_rows_also_count(self):
        self.account(sync='synced')
        self.transaction(sync='synced')
        self.db.commit()
        self.assertEqual(self.progress(), (1, 1))
    def test_account_archive_retains_transaction_fact(self):
        self.account()
        self.transaction()
        self.db.execute("UPDATE local_accounts SET status = 'archived'")
        self.assertEqual(self.progress(), (0, 1))

if __name__ == '__main__':
    unittest.main()

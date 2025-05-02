# run_tests.py
#!/usr/bin/env python3
"""
Test runner script for backend tests with coverage reporting.

Usage:
    python run_tests.py
"""

import os
import sys
import pytest

def main():
    """Run tests with coverage reporting"""
    # Create necessary directories
    os.makedirs('./uploads', exist_ok=True)
    os.makedirs('./data', exist_ok=True)
    
    # Use existing data file if available
    data_files = [f for f in os.listdir('./data') if f.startswith('test_data') and f.endswith('.csv')]
    
    if not data_files:
        # Create simple test data if no test data files exist
        with open('./data/test_data.csv', 'w') as f:
            f.write('id,comment,category,confidence\n')
            f.write('1,"The service was excellent",OK,90\n')
            f.write('2,"I had a terrible experience",Complaint,85\n')
    
    # Run pytest with coverage
    args = [
        # Unit tests
        'tests/unit',
        # Component tests
        'tests/component',
        # End-to-end tests
        'tests/e2e',
        # API tests
        'tests/api',
        '--asyncio-mode=auto',
        '-v',
        '--cov=.',
        '--cov-report=html',
        '--cov-report=term',
    ]
    
    return pytest.main(args)

if __name__ == '__main__':
    sys.exit(main())
import pytest
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

pytest.asyncio_fixture_loop_scope = "function"

# Setup test directories
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Set up test environment for all tests"""
    # Create test directories
    os.makedirs('./uploads', exist_ok=True)
    os.makedirs('./test_chroma_db', exist_ok=True)
    
    # Create a small test CSV
    with open('./data/test_data.csv', 'w') as f:
        f.write('id,comment,category,confidence\n')
        f.write('1,"The service was excellent",OK,90\n')
        f.write('2,"I had a terrible experience",Complaint,85\n')
    
    yield
    
    # Cleanup (uncomment if needed)
    # import shutil
    # if os.path.exists('./test_chroma_db'):
    #     shutil.rmtree('./test_chroma_db')

# Setup pytest.mark.asyncio for async tests
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "asyncio: mark test as requiring asyncio"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "component: mark test as a component test"
    )
    config.addinivalue_line(
        "markers", "api: mark test as an API test"
    )
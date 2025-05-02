# tests/unit/test_agent_timeout_by_time.py
import pytest
import agent
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_process_comment_timeout_by_time(monkeypatch):
    # 1. Suppress error logs to avoid logger.error calling time.time in the timeout branch
    monkeypatch.setattr(agent.logger, "error", lambda *args, **kwargs: None)

    # 2. Instantiate agent (using real time.time, not mocked yet)
    agent_inst = agent.CommentAnalysisAgent(
        api_key="fake_key",
        max_tools=1,
        timeout=5
    )

    # 3. Use AsyncMock to replace main_llm instead of trying to directly modify its methods
    mock_llm = AsyncMock()
    mock_llm.ainvoke.return_value = "irrelevant"
    
    # Save original LLM for later restoration
    original_llm = agent_inst.main_llm
    
    # Replace the entire LLM object instead of trying to modify its methods
    agent_inst.main_llm = mock_llm

    # 4. Prepare a "jumping" time sequence: first call to time.time() is start_time,
    #    second call jumps beyond timeout, triggering the TimeoutError
    start = 1_000_000.0
    calls = [start, start + agent_inst.timeout + 1.0]
    def fake_time():
        if calls:
            return calls.pop(0)
        # If calls are exhausted, return normal time to prevent function from crashing
        return agent.time.time()

    # 5. Globally replace time.time
    with patch('agent.time.time', fake_time):
        # 6. Call and get the result
        result = await agent_inst.process_comment("test comment")

    # 7. Restore original LLM
    agent_inst.main_llm = original_llm

    # 8. Verify the timeout branch
    assert result["category"] == "Error"
    assert "timed out" in result["reasoning"].lower()
# tests/unit/test_agent_process_comment.py
import pytest
import logging
from unittest.mock import AsyncMock
from agent import CommentAnalysisAgent

@pytest.mark.asyncio
async def test_process_comment_skips_to_final_decision(monkeypatch, caplog):
    # 1. Create an agent with max_reasoning_steps=1 to trigger the skip branch after initial reasoning
    agent = CommentAnalysisAgent(api_key="dummy", max_tools=3, max_reasoning_steps=1, timeout=5)

    # 2. Mock the main_llm by replacing the entire object instead of just the method
    fake_initial = "This is the initial analysis result"
    mock_llm = AsyncMock()
    mock_llm.ainvoke.return_value = fake_initial
    
    # Save original LLM for later restoration
    original_llm = agent.main_llm
    
    # Replace the entire LLM object
    agent.main_llm = mock_llm

    # 3. Capture logger.warning
    caplog.set_level(logging.WARNING, logger="agent")
    
    # 4. Mock make_final_decision and record its call arguments
    called = {}
    async def fake_make_final(comment_text, categories, reasoning_chain, tool_results):
        called['args'] = {
            "comment_text": comment_text,
            "categories": categories.copy(),
            "reasoning_chain": reasoning_chain.copy(),
            "tool_results": tool_results.copy()
        }
        return {"category": "OK", "confidence": 42, "reasoning": "Skipped to final", "keywords": [], "reasoning_chain": reasoning_chain}
    monkeypatch.setattr(agent, "make_final_decision", fake_make_final)

    # 5. Call process_comment
    result = await agent.process_comment("Test comment content", ["OK", "Complaint"])

    # 6. Restore original LLM
    agent.main_llm = original_llm

    # 7. Assert make_final_decision was called and its return value was passed through
    assert result["category"] == "OK"
    assert result["confidence"] == 42
    assert result["reasoning"] == "Skipped to final"
    
    # 8. Verify warning log
    assert "Reached max reasoning steps (1)" in caplog.text

    # 9. Verify arguments passed to make_final_decision
    args = called["args"]
    assert args["comment_text"] == "Test comment content"
    assert args["categories"] == ["OK", "Complaint"]
    # reasoning_chain should contain only initial_analysis step
    assert len(args["reasoning_chain"]) == 1
    assert args["reasoning_chain"][0]["step"] == "initial_analysis"
    assert "initial analysis result" in args["reasoning_chain"][0]["content"].lower()
    # tool_results should be an empty dict
    assert args["tool_results"] == {}
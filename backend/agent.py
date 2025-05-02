import os
import json
import logging
import time
from typing import List, Dict, Any, Optional
from enum import Enum

# Import error utilities
import error_utils as err

# Vector database and LLM imports - updated imports
try:
    from langchain_openai import ChatOpenAI
    from langchain.schema import AIMessage
    import rag
    has_agent_dependencies = True
except ImportError:
    has_agent_dependencies = False
    err.logger.warning("Agent dependencies not found. Agent functionality will not be available.")

# Create a logger
logger = logging.getLogger(__name__)

# Global variables
comment_agent = None
sentiment_llm = None
keywords_llm = None
categories_llm = None

# Define agent tools
class AgentTool(str, Enum):
    RETRIEVE_SIMILAR = "retrieve_similar"
    CHECK_KEYWORDS = "check_keywords"
    ANALYZE_SENTIMENT = "analyze_sentiment"
    EXTRACT_ENTITIES = "extract_entities"
    TRANSLATE = "translate_text"

# Default categories - use the same as in rag module
DEFAULT_CATEGORIES = rag.DEFAULT_CATEGORIES if has_agent_dependencies and hasattr(rag, 'DEFAULT_CATEGORIES') else [
    "OK", "Complaint", "Cultural", "Language", "Mental Health", "Sexism", "Appearance", "Wrong Staff"
]

class CommentAnalysisAgent:
    """Advanced agent for comment analysis with multi-step reasoning"""
    
    def __init__(self, api_key=None, max_tools=3, max_reasoning_steps=5, timeout=30):
        """
        Initialize the agent with required tools and LLMs
        
        Args:
            api_key: OpenAI API key
            max_tools: Maximum number of tools to use per comment (prevents excessive API calls)
            max_reasoning_steps: Maximum number of reasoning steps allowed (prevents infinite loops)
            timeout: Maximum time in seconds for processing a comment
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required for agent initialization")
        
        # Initialize agent parameters to prevent excessive steps
        self.max_tools = max_tools
        self.max_reasoning_steps = max_reasoning_steps
        self.timeout = timeout
        
        # Initialize LLMs with different temperatures for different tasks
        self.main_llm = ChatOpenAI(
            model="gpt-4",
            temperature=0,
            openai_api_key=self.api_key
        )
        
        self.creative_llm = ChatOpenAI(
            model="gpt-4",
            temperature=0.4,
            openai_api_key=self.api_key
        )
        
        # Initialize tools dictionary
        self.tools = {
            AgentTool.RETRIEVE_SIMILAR: self.retrieve_similar_comments,
            AgentTool.CHECK_KEYWORDS: self.check_sensitive_keywords,
            AgentTool.ANALYZE_SENTIMENT: self.analyze_sentiment,
            AgentTool.EXTRACT_ENTITIES: self.extract_entities,
            AgentTool.TRANSLATE: self.translate_text
        }
        
        # Initialize prompts
        self._init_prompts()
        
        logger.info("Comment Analysis Agent initialized successfully")
    
    def _init_prompts(self):
        """Initialize the various prompts used by the agent"""
        
        # Main reasoning chain prompt
        self.reasoning_prompt = """
        You are a sophisticated comment analysis system. Analyze the following comment carefully and think step by step.
        
        Comment: {comment}
        
        First, consider what this comment might be about. Think about:
        1. The general tone (positive, negative, neutral)
        2. The subject matter
        3. Any potential issues or concerns it raises
        
        Available categories: {categories}
        
        Think carefully about each possible category, considering the evidence for and against it.
        Make sure to fully justify your reasoning for your final classification.
        """
        
        # Tool selection prompt - modified to emphasize selecting only the most critical tools
        self.tool_selection_prompt = """
        Based on the comment, determine which tools would be most helpful for analysis.
        
        Comment: {comment}
        
        Available tools:
        - retrieve_similar: Find similar comments in the database to help with classification
        - check_keywords: Check for sensitive or concerning keywords
        - analyze_sentiment: Analyze the emotional tone of the comment
        - extract_entities: Extract key entities (people, organizations, etc.) mentioned
        - translate_text: Translate non-English text if needed
        
        IMPORTANT: Select ONLY the 1-3 most critical tools that would provide the most helpful context for this specific comment.
        For simple comments, you might need just 1-2 tools.
        
        Return ONLY the list of tools in a valid JSON format like this:
        {{"tools": ["tool1", "tool2"]}}
        """
        
        # Final decision prompt
        self.final_decision_prompt = """
        Based on all the information gathered, make your final classification decision.
        
        Original comment: {comment}
        
        Reasoning steps performed:
        {reasoning_chain}
        
        Tool results:
        {tool_results}
        
        Available categories: {categories}
        
        Make a final decision and provide:
        1. The category that best matches this comment
        2. A confidence score (0-100)
        3. A brief explanation of your reasoning
        4. 3-5 key phrases from the comment that influenced your decision

        Respond with a valid JSON object ONLY in this exact format:
        {{
          "category": "category_name",
          "confidence": confidence_score,
          "reasoning": "brief reasoning explanation",
          "keywords": ["keyword1", "keyword2", "keyword3"]
        }}
        
        The category MUST be one of the available categories provided. 
        If you're very uncertain, use "OK" with a low confidence score.
        """
    
    def _parse_ai_response(self, response):
        """
        Parse AI response, handling both AIMessage and string responses
        """
        # If it's an AIMessage, extract content
        if isinstance(response, AIMessage):
            content = response.content
        else:
            content = str(response)
        
        # Strip and remove code block markers
        content = content.strip()
        if content.startswith('```json'):
            content = content[7:-3] if content.endswith('```') else content[7:]
        elif content.startswith('```'):
            content = content[3:-3] if content.endswith('```') else content[3:]
        
        return content
    
    async def retrieve_similar_comments(self, comment_text: str) -> Dict[str, Any]:
        """Retrieve similar comments from the vector store"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        # Use rag module's vector store if available
        if not hasattr(rag, 'vector_store') or not rag.vector_store:
            return {
                "status": "error",
                "message": "Vector store not available",
                "results": []
            }
        
        try:
            # Use the existing find_similar_comments function from rag module
            similar_comments = await rag.find_similar_comments(
                comment_text, 
                rag.vector_store,
                k=5,  # Get more examples for agent analysis
                score_threshold=0.01
            )
            
            return {
                "status": "success",
                "message": f"Found {len(similar_comments)} similar comments",
                "results": similar_comments
            }
        except Exception as e:
            logger.error(f"Error retrieving similar comments: {e}")
            return {
                "status": "error",
                "message": f"Error retrieving similar comments: {str(e)}",
                "results": []
            }
    
    async def check_sensitive_keywords(self, comment_text: str) -> Dict[str, Any]:
        """Check for sensitive keywords in the comment"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        # Predefined sensitive keyword categories
        sensitive_categories = {
            "profanity": ["offensive language", "swearing", "bad words"],
            "identity": ["race", "ethnicity", "gender", "sexuality", "religion", "disability"],
            "violence": ["threat", "harm", "attack", "kill", "hurt"],
            "harassment": ["bullying", "stalking", "targeting"],
            "mental_health": ["depression", "anxiety", "suicide", "self-harm"],
            "adult": ["sexual", "explicit", "inappropriate"]
        }
        
        prompt = f"""
        Analyze the following comment for sensitive language across these categories:
        - Profanity: offensive language, swearing, etc.
        - Identity-based: mentions of race, ethnicity, gender, sexuality, religion, disability
        - Violence: threats, mentions of harm, attacks, etc.
        - Harassment: bullying, stalking, targeting individuals
        - Mental health: mentions of depression, anxiety, suicide, self-harm
        - Adult content: sexual, explicit, or inappropriate content
        
        Comment: {comment_text}
        
        For each category, give a score from 0-10 where:
        0 = No content in this category
        1-3 = Mild mentions
        4-7 = Moderate concerns
        8-10 = Severe concerns
        
        Return ONLY a JSON object in this format:
        {{
          "profanity": score,
          "identity": score,
          "violence": score,
          "harassment": score,
          "mental_health": score,
          "adult": score,
          "detected_terms": ["term1", "term2"]
        }}
        
        The "detected_terms" should list specific concerning words or phrases found.
        """
        
        try:
            response = await self.main_llm.ainvoke(prompt)
            content = self._parse_ai_response(response)
            
            result = json.loads(content)
            
            # Add overall concern level based on highest score
            max_score = max([
                result.get("profanity", 0),
                result.get("identity", 0),
                result.get("violence", 0),
                result.get("harassment", 0),
                result.get("mental_health", 0),
                result.get("adult", 0)
            ])
            
            concern_level = "none"
            if max_score >= 8:
                concern_level = "high"
            elif max_score >= 4:
                concern_level = "medium"
            elif max_score >= 1:
                concern_level = "low"
            
            summary = f"Analysis complete. Concern level: {concern_level}"
            
            return {
                "status": "success",
                "message": summary,
                "concern_level": concern_level,
                "results": result
            }
        except Exception as e:
            logger.error(f"Error checking sensitive keywords: {e}")
            return {
                "status": "error",
                "message": f"Error checking sensitive keywords: {str(e)}",
                "results": {}
            }
    
    async def analyze_sentiment(self, comment_text: str) -> Dict[str, Any]:
        """Analyze sentiment of the comment with detailed breakdown"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        prompt = f"""
        Perform a detailed sentiment analysis of the following comment:
        
        Comment: {comment_text}
        
        Please provide the following:
        1. Overall sentiment (positive, negative, neutral, or mixed)
        2. Sentiment score (-100 to 100, where -100 is extremely negative, 0 is neutral, 100 is extremely positive)
        3. Emotional tones detected (e.g., happy, angry, frustrated, grateful, etc.)
        4. Subject sentiment: How the person feels about the subject they're discussing
        
        Return ONLY a JSON object in this format:
        {{
          "overall_sentiment": "positive/negative/neutral/mixed",
          "sentiment_score": score,
          "emotional_tones": ["emotion1", "emotion2"],
          "subject_sentiment": "description"
        }}
        
        Ensure the response is a valid JSON object.
        """
        
        try:
            # Use _parse_ai_response to handle the AI response
            content = self._parse_ai_response(await self.main_llm.ainvoke(prompt))
            
            result = json.loads(content)
            
            # Create a summary message based on sentiment results
            summary = f"Detected {result.get('overall_sentiment', 'unknown')} sentiment with score {result.get('sentiment_score', 0)}"

            return {
                "status": "success",
                "message": summary,
                "results": result
            }
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return {
                "status": "error",
                "message": f"Error analyzing sentiment: {str(e)}",
                "results": {}
            }
    
    async def extract_entities(self, comment_text: str) -> Dict[str, Any]:
        """Extract named entities and key phrases from the comment"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        prompt = f"""
        Extract named entities and key phrases from the following comment:
        
        Comment: {comment_text}
        
        Please identify:
        1. People mentioned
        2. Organizations/institutions mentioned
        3. Locations mentioned
        4. Key topics discussed
        5. Important phrases that capture the main points
        
        Return ONLY a JSON object in this format:
        {{
          "people": ["person1", "person2"],
          "organizations": ["org1", "org2"],
          "locations": ["location1", "location2"],
          "topics": ["topic1", "topic2"],
          "key_phrases": ["phrase1", "phrase2"]
        }}
        
        If any category has no entities, use an empty array.
        """
        
        try:
            content = self._parse_ai_response(await self.main_llm.ainvoke(prompt))
                
            result = json.loads(content)
            summary = f"Found {len(result.get('people', []))} people, {len(result.get('organizations', []))} organizations, and {len(result.get('topics', []))} topics"
            
            return {
                "status": "success",
                "message": summary,
                "results": result
            }
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return {
                "status": "error",
                "message": f"Error extracting entities: {str(e)}",
                "results": {}
            }
    
    async def translate_text(self, comment_text: str) -> Dict[str, Any]:
        """Translate non-English text to English"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        # First detect language
        detect_prompt = f"""
        Identify the language of the following text. 
        If it's in English, just respond with "english". 
        If not, provide the language name.
        
        Text: {comment_text}
        
        Respond with ONLY the language name (or "english").
        """
        
        try:
            detected_language = self._parse_ai_response(await self.main_llm.ainvoke(detect_prompt))
            detected_language = detected_language.strip().lower()
            
            # If already English, return original
            if detected_language == "english":
                return {
                    "status": "success",
                    "detected_language": "english",
                    "needs_translation": False,
                    "translated_text": comment_text,
                    "original_text": comment_text
                }
            
            # Translate to English
            translate_prompt = f"""
            Translate the following text from {detected_language} to English:
            
            Text: {comment_text}
            
            Provide ONLY the translated text without any explanations or formatting.
            """
            
            translated_text = self._parse_ai_response(await self.main_llm.ainvoke(translate_prompt))
            translated_text = translated_text.strip()
            
            return {
                "status": "success",
                "detected_language": detected_language,
                "needs_translation": True,
                "translated_text": translated_text,
                "original_text": comment_text
            }
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            return {
                "status": "error",
                "message": f"Error translating text: {str(e)}",
                "results": {}
            }
    
    async def select_tools(self, comment_text: str) -> List[str]:
        """Select which tools to use for analyzing this comment"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        try:
            formatted_prompt = self.tool_selection_prompt.format(
                comment=comment_text
            )
            
            # Use _parse_ai_response to handle the AI response
            content = self._parse_ai_response(await self.main_llm.ainvoke(formatted_prompt))
            
            result = json.loads(content)
            
            # Get tools list, validating each tool is available
            tools = []
            for tool in result.get("tools", []):
                if tool in self.tools:
                    tools.append(tool)
            
            # Always include retrieve_similar if not already included
            if AgentTool.RETRIEVE_SIMILAR not in tools:
                tools.append(AgentTool.RETRIEVE_SIMILAR)
            
            # OPTIMIZATION: Limit number of tools to prevent excessive API calls
            if len(tools) > self.max_tools:
                # Sort tools by priority: Keep RETRIEVE_SIMILAR, prioritize detection/sentiment
                priority_order = [
                    AgentTool.RETRIEVE_SIMILAR,   # Always keep this
                    AgentTool.CHECK_KEYWORDS,     # High priority for detection
                    AgentTool.ANALYZE_SENTIMENT,  # High priority for understanding
                    AgentTool.TRANSLATE,          # Medium priority (needed for non-English)
                    AgentTool.EXTRACT_ENTITIES    # Lower priority
                ]
                
                # Keep tools in priority order up to max_tools
                prioritized_tools = []
                
                # First ensure RETRIEVE_SIMILAR is included
                if AgentTool.RETRIEVE_SIMILAR in tools:
                    prioritized_tools.append(AgentTool.RETRIEVE_SIMILAR)
                    
                # Then add other tools in priority order
                for tool in priority_order:
                    if tool in tools and tool not in prioritized_tools and len(prioritized_tools) < self.max_tools:
                        prioritized_tools.append(tool)
                
                tools = prioritized_tools[:self.max_tools]
                
            return tools
        except Exception as e:
            logger.error(f"Error selecting tools: {e}")
            # Default to basic tools
            return [AgentTool.RETRIEVE_SIMILAR, AgentTool.ANALYZE_SENTIMENT]
    
    async def initial_reasoning(self, comment_text: str, categories: List[str]) -> str:
        """Perform initial reasoning about the comment before tool use"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        try:
            formatted_prompt = self.reasoning_prompt.format(
                comment=comment_text,
                categories=", ".join(categories)
            )
            
            response = await self.main_llm.ainvoke(formatted_prompt)
            return response
            
        except Exception as e:
            logger.error(f"Error in initial reasoning: {e}")
            return f"Error performing initial reasoning: {str(e)}"
    
    async def process_comment(
        self, 
        comment_text: str,
        categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Process a comment using the Agent with multi-step reasoning and tools
        
        Args:
            comment_text: The comment to analyze
            categories: Optional list of categories to use (defaults to DEFAULT_CATEGORIES)
            
        Returns:
            Dictionary with classification results and reasoning chain
        """
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
            
        if not categories:
            categories = DEFAULT_CATEGORIES
        
        # Initialize reasoning chain tracking
        reasoning_chain = []
        
        # Initialize timing to prevent infinite processing
        start_time = time.time()
        
        try:
            # Check if comment is empty
            if not comment_text or comment_text.strip() == "":
                return {
                    "category": "OK",
                    "confidence": 100,
                    "reasoning": "This is an empty comment with no content to analyze.",
                    "keywords": [],
                    "reasoning_chain": []
                }
            
            # Check for timeout at each step
            def check_timeout():
                if time.time() - start_time > self.timeout:
                    raise TimeoutError(f"Comment analysis timed out after {self.timeout} seconds")
            
            # Step 1: Initial reasoning
            check_timeout()
            initial_analysis_response = await self.main_llm.ainvoke(
                self.reasoning_prompt.format(
                    comment=comment_text,
                    categories=", ".join(categories)
                )
            )
            initial_analysis = self._parse_ai_response(initial_analysis_response)
            reasoning_chain.append({
                "step": "initial_analysis",
                "content": initial_analysis
            })
            
            # If we already have too many steps, skip to final decision
            if len(reasoning_chain) >= self.max_reasoning_steps:
                logger.warning(f"Reached max reasoning steps ({self.max_reasoning_steps}), skipping to final decision")
                return await self.make_final_decision(comment_text, categories, reasoning_chain, {})
            
            # Step 2: Tool selection
            check_timeout()
            selected_tools = await self.select_tools(comment_text)
            reasoning_chain.append({
                "step": "tool_selection",
                "selected_tools": selected_tools
            })
            
            # Step 3: Execute tools
            check_timeout()
            tool_results = {}
            for tool_name in selected_tools:
                tool_fn = self.tools.get(tool_name)
                if tool_fn:
                    # OPTIMIZATION: Don't execute more tools than max allowed
                    if len(tool_results) >= self.max_tools:
                        logger.info(f"Reached max tool limit ({self.max_tools}), skipping remaining tools")
                        break
                        
                    result = await tool_fn(comment_text)
                    tool_results[tool_name] = result
                    
                    # Check timeout after each tool execution
                    check_timeout()
            
            reasoning_chain.append({
                "step": "tool_execution",
                "results": tool_results
            })
            
            # OPTIMIZATION: Handle special case for translations
            if AgentTool.TRANSLATE in tool_results and tool_results[AgentTool.TRANSLATE].get("status") == "success":
                translation_result = tool_results[AgentTool.TRANSLATE]
                if translation_result.get("needs_translation", False):
                    # Add translation step to reasoning chain
                    reasoning_chain.append({
                        "step": "translation",
                        "from_language": translation_result.get("detected_language", "unknown"),
                        "translated_text": translation_result.get("translated_text", "")
                    })
                    
                    # Use translated text for any remaining analysis
                    comment_text = translation_result.get("translated_text", comment_text)
            
            # Step 4: Final decision based on all collected information
            check_timeout()
            return await self.make_final_decision(comment_text, categories, reasoning_chain, tool_results)
            
        except TimeoutError as te:
            logger.error(f"Timeout processing comment: {te}")
            # Return a simple classification with what we have so far
            return {
                "category": "Error",
                "confidence": 0,
                "reasoning": f"Comment processing timed out after {self.timeout} seconds. Analysis incomplete.",
                "keywords": [],
                "reasoning_chain": reasoning_chain
            }
        except Exception as e:
            logger.error(f"Error processing comment with agent: {e}")
            return {
                "category": "Error",
                "confidence": 0,
                "reasoning": f"Error processing comment: {str(e)}",
                "keywords": [],
                "reasoning_chain": reasoning_chain
            }
    
    async def make_final_decision(
        self,
        comment_text: str,
        categories: List[str],
        reasoning_chain: List[Dict[str, Any]],
        tool_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make a final classification decision based on collected information"""
        try:
            final_prompt = self.final_decision_prompt.format(
                comment=comment_text,
                reasoning_chain=json.dumps(reasoning_chain, indent=2),
                tool_results=json.dumps(tool_results, indent=2),
                categories=", ".join(categories)
            )
            
            final_response = await self.main_llm.ainvoke(final_prompt)
            final_content = self._parse_ai_response(final_response)
            
            classification = json.loads(final_content)
            
            # Add reasoning chain to classification
            classification["reasoning_chain"] = reasoning_chain
            
            # Ensure all required fields
            if "category" not in classification:
                classification["category"] = "OK"
            if "confidence" not in classification:
                classification["confidence"] = 50
            if "reasoning" not in classification:
                classification["reasoning"] = "No reasoning provided"
            if "keywords" not in classification:
                classification["keywords"] = []
            
            return classification
                
        except Exception as final_error:
            logger.error(f"Error in final decision: {final_error}")
            # Attempt self-correction
            return await self.self_correction(comment_text, categories, reasoning_chain, tool_results)
    
    async def self_correction(
        self, 
        comment_text: str,
        categories: List[str],
        reasoning_chain: List[Dict[str, Any]],
        tool_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Attempt to correct failures in the processing pipeline"""
        
        # Check and convert HumanMessage to string if needed
        if hasattr(comment_text, 'content'):
            comment_text = comment_text.content
        
        correction_prompt = f"""
        Previous classification attempt failed. Please provide a corrected classification:
        
        Comment: {comment_text}
        
        Available categories: {", ".join(categories)}
        
        Provide a valid JSON object with these fields:
        {{
          "category": "One of the available categories",
          "confidence": Number between 0-100,
          "reasoning": "Brief explanation for the classification",
          "keywords": ["1-3 key phrases from the comment"]
        }}
        
        Respond ONLY with the JSON object, no markdown or additional text.
        """
        
        try:
            response = await self.main_llm.ainvoke(correction_prompt)
            content = self._parse_ai_response(response)
            
            result = json.loads(content)
            
            # Add reasoning chain
            result["reasoning_chain"] = reasoning_chain
            result["reasoning_chain"].append({
                "step": "self_correction",
                "note": "Classification required self-correction due to error in previous step"
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Self-correction failed: {e}")
            # Return basic error result
            return {
                "category": "Error",
                "confidence": 0,
                "reasoning": "Failed to classify comment after multiple attempts",
                "keywords": [],
                "reasoning_chain": reasoning_chain
            }

async def initialize_agent():
    """Initialize the comment analysis agent"""
    global comment_agent
    
    if not has_agent_dependencies:
        err.logger.error("Agent dependencies not available. Agent will not be initialized.")
        return False
    
    # Get API key from environment
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        err.logger.error("OpenAI API key not found. Agent will not be initialized.")
        return False
    
    try:
        # Initialize agent with optimized parameters
        comment_agent = CommentAnalysisAgent(
            api_key=api_key,
            max_tools=3,           # Limit to 3 tools per comment
            max_reasoning_steps=5, # Limit to 5 reasoning steps
            timeout=30             # 30 second timeout per comment
        )
        err.logger.info("Comment analysis agent initialized successfully with safety limits")
        return True
    except Exception as e:
        err.logger.error(f"Error initializing comment analysis agent: {e}")
        return False

# Main function to process a comment with the agent
async def process_comment_with_agent(comment_text: str, categories: List[str] = None) -> Dict[str, Any]:
    """Process a comment with the advanced reasoning agent"""
    
    # Check and convert HumanMessage to string if needed
    if hasattr(comment_text, 'content'):
        comment_text = comment_text.content
    
    if not comment_agent:
        err.logger.error("Agent not initialized.")
        return {
            "category": "Error",
            "confidence": 0,
            "reasoning": "Agent not initialized. Please check server configuration.",
            "keywords": [],
            "reasoning_chain": []
        }
    
    try:
        # Use the agent to process the comment
        result = await comment_agent.process_comment(comment_text, categories)
        return result
    except Exception as e:
        err.logger.error(f"Error processing comment with agent: {e}")
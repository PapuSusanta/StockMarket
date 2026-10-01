using Microsoft.AspNetCore.Mvc;
using StockAnalysis.Api.Services;

namespace StockAnalysis.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AnalysisController(YahooFinanceService yahoo) : ControllerBase
{
    [HttpGet("{symbol}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> Get(string symbol, CancellationToken cancellationToken)
    {
        try { return Ok(await yahoo.Analyze(symbol, cancellationToken)); }
        catch (ArgumentException exception) { return BadRequest(new { error = exception.Message }); }
        catch (InvalidOperationException exception) { return StatusCode(502, new { error = exception.Message }); }
        catch (HttpRequestException exception) { return StatusCode(502, new { error = exception.Message }); }
    }
}

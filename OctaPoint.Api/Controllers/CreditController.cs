using Microsoft.AspNetCore.Mvc;
using OctaPoint.Api.Application.Contracts;
using OctaPoint.Api.Application.Controls;

namespace OctaPoint.Api.Controllers;

[ApiController]
[Route("api/credits")]
public sealed class CreditController(CreditControl creditControl) : ControllerBase
{
    [HttpGet("balance/{customerId}")]
    public ActionResult<ControlResult<BalanceResponse>> GetBalance(string customerId)
    {
        var requestContext = new RequestContext(
            HttpContext.TraceIdentifier,
            Request.Headers["X-Tenant-Id"].ToString(),
            Request.Headers["X-Actor-Id"].ToString(),
            Array.Empty<string>());

        return Ok(creditControl.GetBalance(requestContext, customerId));
    }
}
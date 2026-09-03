using OctaPoint.Api.Application.Contracts;

namespace OctaPoint.Api.Application.Controls;

public sealed class CreditControl
{
    public ControlResult<BalanceResponse> GetBalance(
        RequestContext requestContext,
        string customerId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(customerId);

        return new ControlResult<BalanceResponse>(
            new BalanceResponse(customerId, 0, "OCT", "not-configured"),
            requestContext.RequestId,
            "pending-audit");
    }
}

public sealed record BalanceResponse(
    string CustomerId,
    decimal Balance,
    string Currency,
    string Status);
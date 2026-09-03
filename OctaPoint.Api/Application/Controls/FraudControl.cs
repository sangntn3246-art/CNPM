namespace OctaPoint.Api.Application.Controls;

public sealed class FraudControl
{
    public Task VerifySignatureAsync(CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task CheckRateLimitAsync(CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();

    public Task DetectAnomalyAsync(CancellationToken cancellationToken = default) =>
        throw new NotImplementedException();
}
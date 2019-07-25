
// Based on https://docs.microsoft.com/en-us/azure/api-management/api-management-policy-expressions#ContextVariables
namespace Microsoft.Azure.ApiManagement
{
    using System;
    using System.Collections.Generic;
    using System.Globalization;
    using System.Security.Cryptography.X509Certificates;
    using System.Security.Cryptography;
    using System.Linq;
    using System.Text;
    using System.Threading.Tasks;
    using System.Xml.Linq;

    // The entry point 'context'
    public interface IProxyRequestContext
    {
        Guid RequestId { get; }

        DateTime Timestamp { get; }

        IRequest Request { get; }

        IResponse Response { get; }

        IApi Api { get; }

        IOperation Operation { get; }

        ISubscription Subscription { get; }

        IUser User { get; }

        IProduct Product { get; }

        ProxyError LastError { get; }

        IDeployment Deployment { get; }

        IReadOnlyDictionary<string, object> Variables { get; }

        bool Tracing { get; }

        void Trace(string message);

        void Trace(string source, object data);

        TimeSpan Elapsed { get; }
    }

    public interface IApi
    {
        int StorageId { get; }

        string Id { get; }

        string Name { get; }

        string Version { get; }

        string Revision { get; }

        bool IsCurrentRevision { get; }

        string Path { get; }

        IUrl ServiceUrl { get; }

        IEnumerable<string> Protocols { get; }

        SubscriptionKeyParameterNames SubscriptionKeyParameterNames { get; }
    }

    public interface IDeployment
    {
        string ServiceName { get; }

        string Region { get; }

        string Sku { get; }

        int Units { get; }

        IReadOnlyCollection<IUrl> BaseUrls { get; }

        IReadOnlyDictionary<string, X509Certificate2> Certificates { get; }
    }

    public interface IGroup
    {
        string Id { get; }

        string Name { get; }
    }

    public interface IMessage
    {
        IReadOnlyDictionary<string, string[]> Headers { get; }

        IMessageBody Body { get; }
    }

    public interface IMessageBody
    {
        T As<T>(bool preserveContent = false) where T : class;

        ISoapMessage AsSoap(bool preserveContent = false);
    }

    public interface IOperation
    {
        string Id { get; }

        string Name { get; }

        string Method { get; }

        string UrlTemplate { get; }
    }

    public interface IProduct
    {
        string Id { get; }

        string Name { get; }

        bool SubscriptionRequired { get; }

        bool ApprovalRequired { get; }

        int? SubscriptionsLimit { get; }

        IEnumerable<IGroup> Groups { get; }

        IEnumerable<IApi> Apis { get; }

        ProductState State { get; }
    }

    public interface IRequest : IMessage
    {
        IUrl Url { get; }

        string Method { get; }

        string OriginalMethod { get; }

        IUrl OriginalUrl { get; }

        string IpAddress { get; }

        IReadOnlyDictionary<string, string> MatchedParameters { get; }

        bool HasBody { get; }

        IEnumerable<X509Certificate> ClientCertificates { get; }

        X509Certificate2 Certificate { get; }
    }

    public interface IResponse : IMessage
    {
        int StatusCode { get; }

        string StatusReason { get; }
    }

    public class BasicAuthCredentials
    {
        BasicAuthCredentials()
        {

        }

        public string UserId { get; }

        public string Password { get; }
    }

    public enum SoapVersionLiteral
    {
        Soap11,
        Soap12
    }

    public interface ISoapMessage
    {
        SoapVersionLiteral Version { get; set; }

        string Action { get; set; }

        IEnumerable<ISoapHeader> Headers { get; set; }

        ISoapBody Body { get; set; }
    }

    public interface ISoapHeader
    {
        XName Name { get; }
        string Value { get; }
        Uri Actor { get; }
        bool MustUnderstand { get; }
    }

    public interface ISoapBody
    {
        XName Name { get; }
        XElement Contents { get; }
    }

    public interface ISubscription
    {
        string Id { get; }

        string Name { get; }

        DateTime CreatedDate { get; }

        string Key { get; }

        string PrimaryKey { get; }

        string SecondaryKey { get; }

        DateTime? StartDate { get; }

        DateTime? EndDate { get; }
    }

    public interface IUrl : ICloneable
    {
        string Scheme { get; }

        string Host { get; }

        int Port { get; }

        string Path { get; }

        IReadOnlyDictionary<string, string[]> Query { get; }

        string QueryString { get; }

        Uri ToUri();

        string ToString();
    }

    public interface IUser
    {
        string Id { get; }

        string Email { get; }

        string FirstName { get; }

        string LastName { get; }

        IEnumerable<IGroup> Groups { get; }

        DateTime RegistrationDate { get; }

        string Note { get; }

        IEnumerable<IUserIdentity> Identities { get; }
    }

    public interface IUserIdentity
    {
        string Provider { get; }

        string Id { get; }
    }

    public class Jwt
    {
        Jwt()
        {

        }

        /// <summary>
        /// 'alg' header parameter
        /// </summary>
        public string Algorithm { get; }

        /// <summary>
        /// 'typ' header parameter
        /// </summary>
        public string Type { get; }

        /// <summary>
        /// 'iss' claim
        /// </summary>
        public string Issuer { get; }

        /// <summary>
        /// 'sub' claim
        /// </summary>
        public string Subject { get; }

        /// <summary>
        /// 'aud' claim
        /// </summary>
        public IEnumerable<string> Audiences { get; }

        /// <summary>
        /// 'exp' claim
        /// </summary>
        public DateTime? ExpirationTime { get; }

        /// <summary>
        /// 'nbf' claim
        /// </summary>
        public DateTime? NotBefore { get; }

        /// <summary>
        /// 'iat' claim
        /// </summary>
        public DateTime? IssuedAt { get; }

        /// <summary>
        /// 'jti' claim
        /// </summary>
        public string Id { get; }

        public IReadOnlyDictionary<string, string[]> Claims { get; }
    }

    public enum ProductState
    {
        NotPublished = 0,
        Published = 1
    }

    /// <summary>
    /// Error that occured during request processing and is available in expression for inspection
    /// </summary>
    public class ProxyError
    {
        public int Elapsed { get; set; }

        /// <summary>
        /// The component that caused the error e.g. ValidateJwtPolicy
        /// </summary>
        public string Source { get; set; }

        /// <summary>
        /// Short string identifying the reason for using in expressions
        /// </summary>
        public string Reason { get; set; }

        /// <summary>
        /// Human readable error message e.g. Exception message
        /// </summary>
        public string Message { get; set; }

        public string Scope { get; set; }

        public string Section { get; set; }

        public string Path { get; set; }

        public string PolicyId { get; set; }

        public int TransportErrorCode { get; set; }

        public int HttpErrorCode { get; set; }

        public ProxyError(string source, string reason, string message)
            : this()
        {
            this.Source = source;
            this.Reason = reason;
            this.Message = message;
        }

        public ProxyError()
        {
        }

        public override string ToString()
        {
            return $@"{{
    ""elapsed"" : ""{this.Elapsed}"",
    ""source"": ""{this.Source}"",
    ""reason"": ""{this.Reason}"",
    ""message"": ""{this.Message}"",
    ""scope"": ""{this.Scope}"",
    ""section"": ""{this.Section}"",
    ""transportErrorCode"": {this.TransportErrorCode}
}}";
        }
    }

    public struct SubscriptionKeyParameterNames
    {
        public string Header { get; }

        public string Query { get; }
    }

    public class UserVariableCastException : Exception
    {
        public UserVariableCastException(string name, Type expectedType, Type actualType)
            : base(string.Format(CultureInfo.InvariantCulture, "Unable to convert context variable `{0}` of type `{1}` to the type of `{2}`.", name, actualType.FullName, expectedType.FullName))
        {
        }
    }

    public static class ExpressionSyntaxExtensions
    {
        public static TValue GetValueOrDefault<TKey, TValue>(this IDictionary<TKey, TValue> dictionary, TKey key) => throw new NotImplementedException();

        public static TValue GetValueOrDefault<TKey, TValue>(this IDictionary<TKey, TValue> dictionary, TKey key, TValue defaultValue) => throw new NotImplementedException();

        public static TValue GetValueOrDefault<TKey, TValue>(this IReadOnlyDictionary<TKey, TValue> dictionary, TKey key) => throw new NotImplementedException();

        public static TValue GetValueOrDefault<TKey, TValue>(this IReadOnlyDictionary<TKey, TValue> dictionary, TKey key, TValue defaultValue) => throw new NotImplementedException();

        public static T GetValueOrDefault<T>(this IReadOnlyDictionary<string, object> dictionary, string key, T defaultValue = default(T)) => throw new NotImplementedException();

        public static string GetValueOrDefault(this IReadOnlyDictionary<string, string[]> dictionary, string headerName) => throw new NotImplementedException();

        public static string GetValueOrDefault(this IReadOnlyDictionary<string, string[]> dictionary, string headerName, string defaultValue) => throw new NotImplementedException();

        public static bool TryParseBasic(this string input, out BasicAuthCredentials credentials) => throw new NotImplementedException();

        public static BasicAuthCredentials AsBasic(this string input) => throw new NotImplementedException();

        public static bool TryParseJwt(this string input, out Jwt token) => throw new NotImplementedException();

        public static Jwt AsJwt(this string input) => throw new NotImplementedException();
    }

    public static class CryptographyExtensions
    {
        public static byte[] Encrypt(this byte[] input, string alg, byte[] key, byte[] iv) => throw new NotImplementedException();

        public static byte[] Encrypt(this byte[] input, SymmetricAlgorithm alg) => throw new NotImplementedException();

        public static byte[] Encrypt(this byte[] input, SymmetricAlgorithm alg, byte[] key, byte[] iv) => throw new NotImplementedException();

        public static byte[] Decrypt(this byte[] input, string alg, byte[] key, byte[] iv) => throw new NotImplementedException();

        public static byte[] Decrypt(this byte[] input, SymmetricAlgorithm alg, byte[] key, byte[] iv) => throw new NotImplementedException();

        public static byte[] Decrypt(this byte[] input, SymmetricAlgorithm alg) => throw new NotImplementedException();

        public static bool VerifyNoRevocation(this X509Certificate2 input) => throw new NotImplementedException();
    }
}
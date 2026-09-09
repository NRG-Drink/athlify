namespace Athlify.Api.Types;

[QueryType]
public static partial class HelloWorldQuery
{
    public static string HelloPerson(string name = "World")
        => $"Hello {name}!";
}

/* 
## Query: (Note the aliases greet1 and greet2 to differentiate the two calls to helloPerson)
query Hello($varName : String) {
  greet1: helloPerson(name: "beat")
  greet2: helloPerson(name: $varName)
}

## Variables:
{
  "varName": "#beat"
}

## Result:
{
  "data": {
    "greet1": "Hello beat!",
    "greet2": "Hello #beat!"
  }
}
 */

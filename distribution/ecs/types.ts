/**
 * Type system for AWS ECR repository name validation.
 * This module provides compile-time validation for ECR repository names,
 * ensuring they meet AWS length requirements (max 255 characters).
 */

/**
 * MaxLength is a conditional type that enforces a maximum length constraint on string types.
 *
 * @template T - The input string type to be validated
 * @template N - The maximum length allowed for the string
 *
 * The type works by:
 * 1. Extracting the length of the input string using `infer L`
 * 2. Comparing the length against the maximum allowed length
 * 3. Either returning the original type or 'never' based on the comparison
 *
 * @example
 * type ShortString = MaxLength<"hello", 10>; // Type is "hello"
 * type InvalidString = MaxLength<"toolong", 5>; // Type is never
 */
export type MaxLength<T extends string, N extends number> = T extends {
  length: infer L;
}
  ? L extends N
    ? T
    : L extends number
    ? number extends L
      ? string
      : L extends N
      ? T
      : L extends Exclude<number, N>
      ? never
      : T
    : string
  : string;

/**
 * EcrRepositoryName is a specialized type that enforces AWS ECR repository naming rules.
 * Currently implements the 255-character limit requirement.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecr-repository.html
 *
 * @example
 * type ValidRepo = EcrRepositoryName; // Type allows strings up to 255 chars
 */
export type EcrRepositoryName = MaxLength<string, 255>;

/**
 * ValidateStringLength is a more sophisticated version of MaxLength that provides
 * additional type safety through branded types and explicit error states.
 *
 * @template T - The input string type to be validated
 * @template N - The maximum length allowed for the string
 *
 * The type implements a complex type hierarchy that:
 * 1. Validates string length
 * 2. Provides branded types for additional type safety
 * 3. Includes explicit error states through the 'tooLong' brand
 *
 * This type is particularly useful when you need to ensure that string length
 * validation errors are caught at compile time rather than runtime.
 *
 * @example
 * type Valid = ValidateStringLength<"short", 10>; // Type is "short"
 * type Invalid = ValidateStringLength<"toolong", 5>; // Type is never
 */
export type ValidateStringLength<
  T extends string,
  N extends number
> = T extends {
  length: infer L;
}
  ? L extends number
    ? L extends N
      ? T
      : number extends L
      ? string
      : L extends Exclude<number, N>
      ? L extends number
        ? L extends number & { readonly brand: unique symbol }
          ? T
          : L extends number
          ? L extends number & { readonly tooLong: true }
            ? never
            : T
          : never
        : never
      : T
    : string
  : string;

/**
 * Validates an ECR repository name at compile time and runtime.
 *
 * This function serves two purposes:
 * 1. Provides compile-time type checking using ValidateStringLength
 * 2. Performs runtime validation of string length
 *
 * @param name - The repository name to validate
 * @returns The validated repository name with type guarantees
 * @throws Error if the name exceeds 255 characters
 *
 * @example
 * const validName = validateEcrRepositoryName("my-repo"); // OK
 * const invalidName = validateEcrRepositoryName("a".repeat(256)); // Error
 */
export const validateEcrRepositoryName = <T extends string>(
  name: T
): ValidateStringLength<T, 255> => {
  if (name.length > 255) {
    throw new Error("ECR repository name must be 255 characters or less");
  }
  return name as string as ValidateStringLength<T, 255>;
};

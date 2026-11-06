Feature: Leaving unedited files alone

  The file on disk is the source of truth, so opening a document and saving it
  without touching it must not rewrite a single byte.

  Scenario Outline: Saving unedited text changes nothing
    Given a file "notes.md" shaped like <shape>
    When I read "notes.md"
    And I save it back unchanged
    Then the save succeeds
    And "notes.md" is byte for byte what it was

    Examples:
      | shape                 |
      | plain lines           |
      | no trailing newline   |
      | carriage returns      |
      | mixed line endings    |
      | trailing whitespace   |
      | tabs between words    |
      | multi-byte characters |
      | an empty file         |

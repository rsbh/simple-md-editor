Feature: Recently opened files

  The palette offers files that were opened before, so the list has to stay
  ordered, free of duplicates, and free of files that no longer exist.

  Scenario: Opening a file records it
    Given a file "notes.md" containing:
      """
      notes
      """
    When I read "notes.md"
    Then the recent list is:
      | notes.md |

  Scenario: The most recently opened file comes first
    Given a file "one.md" containing:
      """
      one
      """
    And a file "two.md" containing:
      """
      two
      """
    When I read "one.md"
    And I read "two.md"
    Then the recent list is:
      | two.md |
      | one.md |

  Scenario: Opening a file again moves it up rather than duplicating it
    Given a file "one.md" containing:
      """
      one
      """
    And a file "two.md" containing:
      """
      two
      """
    When I read "one.md"
    And I read "two.md"
    And I read "one.md"
    Then the recent list is:
      | one.md |
      | two.md |

  Scenario: Saving a file records it too
    When I save "fresh.md" with:
      """
      fresh
      """
    Then the recent list is:
      | fresh.md |

  Scenario: Files deleted since they were opened are dropped
    Given a file "one.md" containing:
      """
      one
      """
    And a file "two.md" containing:
      """
      two
      """
    When I read "one.md"
    And I read "two.md"
    And "one.md" was deleted elsewhere
    Then the recent list is:
      | two.md |

  Scenario: The list does not grow without bound
    When I read 25 separate files
    Then the recent list holds 20 entries
